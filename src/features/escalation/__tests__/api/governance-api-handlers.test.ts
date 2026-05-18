import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  EscalationExecutionStatus,
  EscalationStatus,
  EscalationTriggerSource,
  UserRole,
} from "@prisma/client";

import type { GovernanceSchedulerControls } from "@/features/escalation/api/scheduler-control";
import type { EscalationSchedulerState } from "@/features/escalation/scheduler/types";
import {
  handleDismissEscalation,
  handleGovernanceAnalytics,
  handleListEscalations,
  handleResolveEscalation,
  handleRunEscalationCycle,
  handleSchedulerStart,
  handleSchedulerState,
  handleSchedulerStop,
} from "@/features/escalation/api/handlers";
import type { GovernanceApiSession } from "@/features/escalation/api/types";
import type {
  DismissEscalationInput,
  ResolveEscalationInput,
} from "@/features/escalation/resolution/types";
import {
  dismissEscalationWithClient,
  resolveEscalationWithClient,
} from "@/features/escalation/services/escalation-resolution-service";
import {
  BASE_NOW,
  daysAfter,
  employee,
  escalationLog,
  escalationRule,
  manager,
} from "@/features/escalation/__tests__/fixtures/escalation-fixtures";
import { createEscalationTestDb } from "@/features/escalation/__tests__/helpers/in-memory-escalation-db";

const ADMIN_SESSION: GovernanceApiSession = {
  user: {
    id: "admin-user",
    role: UserRole.ADMIN,
  },
};

const MANAGER_SESSION: GovernanceApiSession = {
  user: {
    id: "manager-product",
    role: UserRole.MANAGER,
  },
};

const EMPLOYEE_SESSION: GovernanceApiSession = {
  user: {
    id: "employee-product",
    role: UserRole.EMPLOYEE,
  },
};

function jsonRequest(path: string, body: Record<string, unknown>) {
  return new Request(`https://atomquest.test${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
  });
}

async function jsonBody(response: Response) {
  return (await response.json()) as {
    data?: Record<string, unknown>;
    error?: {
      code: string;
      message: string;
    };
  };
}

function createSchedulerControls(): GovernanceSchedulerControls {
  let state: EscalationSchedulerState = {
    enabled: true,
    intervalMs: 60000,
    dryRun: false,
    isStarted: false,
    isCycleRunning: false,
    startedAt: null,
    stoppedAt: null,
    runCount: 0,
    completedCount: 0,
    failedCount: 0,
    skippedOverlapCount: 0,
    lastRunStartedAt: null,
    lastRunCompletedAt: null,
    lastSkippedAt: null,
    lastExecutionId: null,
    lastError: null,
  };

  return {
    getState: () => ({
      action: state.isStarted ? "ALREADY_STARTED" : "NOT_RUNNING",
      registered: state.isStarted,
      state,
    }),
    start: () => {
      if (!state.isStarted) {
        state = {
          ...state,
          isStarted: true,
          startedAt: BASE_NOW,
        };
      }

      return {
        action: "STARTED",
        registered: true,
        state,
      };
    },
    stop: () => {
      state = {
        ...state,
        isStarted: false,
        stoppedAt: daysAfter(BASE_NOW, 1),
      };

      return {
        action: "STOPPED",
        registered: true,
        state,
      };
    },
  };
}

describe("governance API handlers", () => {
  test("enforces RBAC for analytics and controlled invocation endpoints", async () => {
    const { db } = createEscalationTestDb();

    const unauthenticatedResponse = await handleGovernanceAnalytics({
      request: new Request("https://atomquest.test/api/governance/analytics/overview"),
      session: null,
      db,
      kind: "overview",
      now: BASE_NOW,
    });
    const employeeRunResponse = await handleRunEscalationCycle({
      request: jsonRequest("/api/governance/executions/run", {}),
      session: EMPLOYEE_SESSION,
      now: BASE_NOW,
      runEscalationCycleService: async () => {
        throw new Error("Runner should not be called for unauthorized users.");
      },
    });

    assert.equal(unauthenticatedResponse.status, 401);
    assert.equal((await jsonBody(unauthenticatedResponse)).error?.code, "AUTHENTICATION_REQUIRED");
    assert.equal(employeeRunResponse.status, 403);
    assert.equal((await jsonBody(employeeRunResponse)).error?.code, "AUTHORIZATION_REQUIRED");
  });

  test("lists escalations with DTO serialization and manager scoping", async () => {
    const { db } = createEscalationTestDb({
      users: [
        manager(),
        manager({
          id: "manager-sales",
          email: "sales.manager@example.com",
          department: "Sales",
        }),
        employee(),
        employee({
          id: "employee-sales",
          email: "sales.employee@example.com",
          department: "Sales",
          managerId: "manager-sales",
        }),
      ],
      escalationRules: [escalationRule()],
      escalationLogs: [
        escalationLog({
          id: "manager-visible-log",
          managerId: "manager-product",
        }),
        escalationLog({
          id: "manager-hidden-log",
          managerId: "manager-sales",
          employeeId: "employee-sales",
        }),
      ],
    });

    const response = await handleListEscalations({
      request: new Request("https://atomquest.test/api/governance/escalations?status=OPEN"),
      session: MANAGER_SESSION,
      db,
    });
    const body = await jsonBody(response);
    const escalations = body.data?.escalations as Array<{
      id: string;
      triggeredAt: string;
      employee: { name: string };
    }>;

    assert.equal(response.status, 200);
    assert.equal(body.data?.count, 1);
    assert.equal(escalations[0].id, "manager-visible-log");
    assert.equal(escalations[0].triggeredAt, BASE_NOW.toISOString());
    assert.equal(escalations[0].employee.name, "Evan Stone");
  });

  test("runs escalation cycle only through the canonical invocation boundary", async () => {
    let capturedTriggerSource: EscalationTriggerSource | null = null;
    let capturedTriggeredByUserId: string | null | undefined;
    let capturedDryRunProviders: unknown;

    const response = await handleRunEscalationCycle({
      request: jsonRequest("/api/governance/executions/run", { dryRun: true }),
      session: ADMIN_SESSION,
      now: BASE_NOW,
      runEscalationCycleService: async (input) => {
        capturedTriggerSource = input.triggerSource;
        capturedTriggeredByUserId = input.triggeredByUserId;
        capturedDryRunProviders = input.providers;

        return {
          executionId: "execution-api-run",
          status: EscalationExecutionStatus.COMPLETED,
          triggerSource: input.triggerSource,
          triggeredByUserId: input.triggeredByUserId ?? null,
          startedAt: BASE_NOW,
          completedAt: BASE_NOW,
          summary: {
            rulesEvaluated: 3,
            violationsDetected: 1,
            logsCreated: 1,
            evaluationDuplicates: 0,
            notificationsAttempted: 0,
            notificationsDelivered: 0,
            notificationsSkipped: 0,
            notificationDuplicates: 0,
            failures: 0,
          },
          evaluation: null,
          notifications: null,
        };
      },
    });
    const body = await jsonBody(response);

    assert.equal(response.status, 200);
    assert.equal(capturedTriggerSource, EscalationTriggerSource.API);
    assert.equal(capturedTriggeredByUserId, "admin-user");
    assert.deepEqual(capturedDryRunProviders, []);
    assert.equal(body.data?.executionId, "execution-api-run");
    assert.equal(body.data?.startedAt, BASE_NOW.toISOString());
  });

  test("resolves assigned escalation for manager and blocks invalid lifecycle repeat", async () => {
    const { db, state } = createEscalationTestDb({
      escalationRules: [escalationRule()],
      escalationLogs: [escalationLog()],
    });

    const resolveService = (input: ResolveEscalationInput) =>
      resolveEscalationWithClient({
        db,
        ...input,
      });

    const response = await handleResolveEscalation({
      request: jsonRequest("/api/governance/escalations/existing-escalation-log/resolve", {
        reason: "Manager completed governance follow-up.",
        notes: "Closure reviewed with employee.",
      }),
      session: MANAGER_SESSION,
      db,
      escalationLogId: "existing-escalation-log",
      now: daysAfter(BASE_NOW, 1),
      resolveEscalationService: resolveService,
    });
    const repeatResponse = await handleResolveEscalation({
      request: jsonRequest("/api/governance/escalations/existing-escalation-log/resolve", {
        reason: "Second attempt.",
      }),
      session: MANAGER_SESSION,
      db,
      escalationLogId: "existing-escalation-log",
      now: daysAfter(BASE_NOW, 2),
      resolveEscalationService: resolveService,
    });

    assert.equal(response.status, 200);
    assert.equal(state.escalationLogs[0].status, EscalationStatus.RESOLVED);
    assert.equal(state.escalationLogs[0].resolvedByUserId, "manager-product");
    assert.equal(repeatResponse.status, 409);
    assert.equal((await jsonBody(repeatResponse)).error?.code, "LIFECYCLE_VALIDATION_FAILED");
  });

  test("prevents managers from resolving escalations assigned to another manager", async () => {
    const { db } = createEscalationTestDb({
      users: [
        manager(),
        manager({
          id: "manager-sales",
          email: "sales.manager@example.com",
          department: "Sales",
        }),
        employee({
          id: "employee-sales",
          email: "sales.employee@example.com",
          department: "Sales",
          managerId: "manager-sales",
        }),
      ],
      escalationRules: [escalationRule()],
      escalationLogs: [
        escalationLog({
          managerId: "manager-sales",
          employeeId: "employee-sales",
        }),
      ],
    });

    const response = await handleResolveEscalation({
      request: jsonRequest("/api/governance/escalations/existing-escalation-log/resolve", {
        reason: "Manager tries to close another manager's escalation.",
      }),
      session: MANAGER_SESSION,
      db,
      escalationLogId: "existing-escalation-log",
      resolveEscalationService: async () => {
        throw new Error("Resolution service should not be reached.");
      },
    });

    assert.equal(response.status, 403);
    assert.equal((await jsonBody(response)).error?.code, "AUTHORIZATION_REQUIRED");
  });

  test("allows admin dismissal and rejects manager dismissal", async () => {
    const { db, state } = createEscalationTestDb({
      escalationRules: [escalationRule()],
      escalationLogs: [escalationLog()],
    });
    const dismissService = (input: DismissEscalationInput) =>
      dismissEscalationWithClient({
        db,
        ...input,
      });

    const managerResponse = await handleDismissEscalation({
      request: jsonRequest("/api/governance/escalations/existing-escalation-log/dismiss", {
        reason: "Manager dismissal attempt.",
      }),
      session: MANAGER_SESSION,
      escalationLogId: "existing-escalation-log",
      dismissEscalationService: dismissService,
    });
    const adminResponse = await handleDismissEscalation({
      request: jsonRequest("/api/governance/escalations/existing-escalation-log/dismiss", {
        reason: "Approved exception window.",
        notes: "Governance owner approved the exception.",
      }),
      session: ADMIN_SESSION,
      escalationLogId: "existing-escalation-log",
      now: daysAfter(BASE_NOW, 1),
      dismissEscalationService: dismissService,
    });

    assert.equal(managerResponse.status, 403);
    assert.equal(adminResponse.status, 200);
    assert.equal(state.escalationLogs[0].status, EscalationStatus.DISMISSED);
    assert.equal(state.escalationLogs[0].dismissedByUserId, "admin-user");
  });

  test("exposes analytics DTOs with deterministic time-window parsing", async () => {
    const { db } = createEscalationTestDb({
      escalationRules: [escalationRule()],
      escalationLogs: [
        escalationLog({
          id: "current-open-log",
          triggeredAt: BASE_NOW,
          metadata: {
            reviewCycleId: "cycle-active-q2-2026",
            reviewCycleName: "Q2 2026 Operating Cycle",
            reviewCycleYear: 2026,
            reviewCycleQuarter: 2,
          },
        }),
      ],
    });

    const response = await handleGovernanceAnalytics({
      request: new Request(
        "https://atomquest.test/api/governance/analytics/overview?window=LAST_7_DAYS",
      ),
      session: MANAGER_SESSION,
      db,
      kind: "overview",
      now: daysAfter(BASE_NOW, 1),
    });
    const invalidResponse = await handleGovernanceAnalytics({
      request: new Request(
        "https://atomquest.test/api/governance/analytics/overview?window=ROLLING_MAGIC",
      ),
      session: MANAGER_SESSION,
      db,
      kind: "overview",
      now: BASE_NOW,
    });
    const body = await jsonBody(response);

    assert.equal(response.status, 200);
    assert.equal(body.data?.generatedAt, daysAfter(BASE_NOW, 1).toISOString());
    assert.equal(body.data?.totalEscalations, 1);
    assert.equal(invalidResponse.status, 400);
    assert.equal((await jsonBody(invalidResponse)).error?.code, "INVALID_REQUEST");
  });

  test("exposes scheduler controls without starting duplicate infrastructure", async () => {
    const controls = createSchedulerControls();

    const initialResponse = await handleSchedulerState({
      session: ADMIN_SESSION,
      controls,
    });
    const startResponse = await handleSchedulerStart({
      session: ADMIN_SESSION,
      controls,
    });
    const stopResponse = await handleSchedulerStop({
      session: ADMIN_SESSION,
      controls,
    });
    const forbiddenResponse = await handleSchedulerStart({
      session: MANAGER_SESSION,
      controls,
    });

    assert.equal(initialResponse.status, 200);
    assert.equal((await jsonBody(initialResponse)).data?.registered, false);
    assert.equal(startResponse.status, 200);
    assert.equal((await jsonBody(startResponse)).data?.action, "STARTED");
    assert.equal(stopResponse.status, 200);
    assert.equal((await jsonBody(stopResponse)).data?.action, "STOPPED");
    assert.equal(forbiddenResponse.status, 403);
  });
});
