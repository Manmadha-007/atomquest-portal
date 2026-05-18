import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  EscalationLevel,
  EscalationStatus,
  EscalationTriggerSource,
  EscalationType,
} from "@prisma/client";

import {
  GovernanceConsoleApiError,
  fetchGovernanceConsoleData,
  requestGovernanceApi,
  resolveEscalationFromConsole,
  runEscalationCycleFromConsole,
  startSchedulerFromConsole,
  stopSchedulerFromConsole,
} from "@/features/escalation/ui/api-client";
import type { GovernanceConsoleData } from "@/features/escalation/ui/types";
import {
  buildGovernanceMetricCards,
  getEscalationStatusTone,
  getGovernanceCapabilities,
} from "@/features/escalation/ui/view-models";

const generatedAt = "2026-05-20T09:00:00.000Z";

const sampleConsoleData: GovernanceConsoleData = {
  overview: {
    generatedAt,
    window: {
      preset: "LAST_30_DAYS",
      label: "Last 30 days",
      from: "2026-04-20T09:00:00.000Z",
      to: generatedAt,
      reviewCycleId: null,
      reviewCycleName: null,
    },
    totalEscalations: 4,
    openEscalations: 2,
    resolvedEscalations: 1,
    dismissedEscalations: 1,
    unresolvedEscalations: 2,
    byType: [
      {
        escalationType: EscalationType.GOAL_NOT_SUBMITTED,
        count: 2,
        openCount: 1,
        resolvedCount: 1,
        dismissedCount: 0,
      },
      {
        escalationType: EscalationType.APPROVAL_PENDING_TOO_LONG,
        count: 1,
        openCount: 0,
        resolvedCount: 0,
        dismissedCount: 1,
      },
      {
        escalationType: EscalationType.CHECKIN_MISSED,
        count: 1,
        openCount: 1,
        resolvedCount: 0,
        dismissedCount: 0,
      },
    ],
    byLevel: [
      {
        escalationLevel: EscalationLevel.LEVEL_1,
        count: 2,
        openCount: 1,
        resolvedCount: 1,
        dismissedCount: 0,
      },
      {
        escalationLevel: EscalationLevel.LEVEL_2,
        count: 1,
        openCount: 0,
        resolvedCount: 0,
        dismissedCount: 1,
      },
      {
        escalationLevel: EscalationLevel.LEVEL_3,
        count: 1,
        openCount: 1,
        resolvedCount: 0,
        dismissedCount: 0,
      },
    ],
    byReviewCycle: [],
  },
  lifecycle: {
    generatedAt,
    window: {
      preset: "LAST_30_DAYS",
      label: "Last 30 days",
      from: "2026-04-20T09:00:00.000Z",
      to: generatedAt,
      reviewCycleId: null,
      reviewCycleName: null,
    },
    slaWindowDays: 7,
    resolvedCount: 1,
    dismissedCount: 1,
    closedCount: 2,
    dismissalRatio: 0.5,
    meanResolutionHours: 24,
    meanDismissalHours: 48,
    meanClosureHours: 36,
    resolvedWithinSlaCount: 1,
    resolvedWithinSlaRatio: 1,
    unresolvedOpenCount: 2,
    meanOpenAgeDays: 6,
    oldestOpenEscalation: {
      escalationLogId: "log-oldest",
      escalationType: EscalationType.CHECKIN_MISSED,
      escalationLevel: EscalationLevel.LEVEL_3,
      employeeId: "employee-product",
      managerId: "manager-product",
      targetGoalId: "goal-product",
      triggeredAt: "2026-05-10T09:00:00.000Z",
      ageDays: 10,
    },
    openEscalationAging: [
      { bucket: "0_3_DAYS", label: "0-3 days", count: 0 },
      { bucket: "4_7_DAYS", label: "4-7 days", count: 1 },
      { bucket: "8_14_DAYS", label: "8-14 days", count: 1 },
      { bucket: "15_PLUS_DAYS", label: "15+ days", count: 0 },
    ],
    recurrence: [],
  },
  executionHealth: {
    generatedAt,
    window: {
      preset: "LAST_30_DAYS",
      label: "Last 30 days",
      from: "2026-04-20T09:00:00.000Z",
      to: generatedAt,
      reviewCycleId: null,
      reviewCycleName: null,
    },
    totalExecutions: 2,
    completedExecutions: 1,
    failedExecutions: 1,
    partiallyCompletedExecutions: 0,
    runningExecutions: 0,
    scheduledExecutionCount: 1,
    successRatio: 0.5,
    failureRatio: 0.5,
    meanExecutionDurationMs: 1000,
    schedulerOverlapSkippedCount: 2,
    rulesEvaluated: 3,
    violationsDetected: 2,
    logsCreated: 1,
    evaluationDuplicates: 1,
    notificationsAttempted: 2,
    notificationsDelivered: 1,
    notificationsSkipped: 0,
    notificationDuplicates: 1,
    notificationDeliverySuccessRatio: 0.5,
    failures: 1,
    recentExecutions: [
      {
        executionId: "execution-latest",
        status: "COMPLETED",
        triggerSource: EscalationTriggerSource.API,
        triggeredByUserId: "admin-user",
        startedAt: generatedAt,
        completedAt: generatedAt,
        durationMs: 1000,
        rulesEvaluated: 3,
        logsCreated: 1,
        notificationsAttempted: 2,
        notificationsDelivered: 1,
        notificationsSkipped: 0,
        failures: 0,
        errorSummary: null,
      },
    ],
  },
  accountability: {
    generatedAt,
    window: {
      preset: "LAST_30_DAYS",
      label: "Last 30 days",
      from: "2026-04-20T09:00:00.000Z",
      to: generatedAt,
      reviewCycleId: null,
      reviewCycleName: null,
    },
    escalationsByDepartment: [],
    unresolvedEscalationsByDepartment: [],
    escalationsByManager: [],
    resolutionOwnership: [],
    repeatEscalationHotspots: [],
  },
  escalations: {
    count: 1,
    escalations: [
      {
        id: "log-open",
        escalationRuleId: "rule-goal",
        escalationRuleName: "Goal submission overdue",
        escalationType: EscalationType.GOAL_NOT_SUBMITTED,
        escalationLevel: EscalationLevel.LEVEL_1,
        status: EscalationStatus.OPEN,
        triggeredAt: generatedAt,
        resolvedAt: null,
        dismissedAt: null,
        employee: {
          id: "employee-product",
          name: "Evan Stone",
          email: "evan.stone@example.com",
          department: "Product Engineering",
        },
        manager: {
          id: "manager-product",
          name: "Maya Patel",
          email: "maya.patel@example.com",
          department: "Product Engineering",
        },
        targetGoal: null,
        message: "Goal submission remained overdue.",
        metadata: null,
        resolution: {
          resolvedByUserId: null,
          dismissedByUserId: null,
          resolutionReason: null,
          dismissalReason: null,
          resolutionNotes: null,
        },
        createdAt: generatedAt,
        updatedAt: generatedAt,
      },
    ],
  },
  scheduler: {
    registered: true,
    state: {
      enabled: true,
      intervalMs: 3600000,
      dryRun: false,
      isStarted: true,
      isCycleRunning: false,
      startedAt: generatedAt,
      stoppedAt: null,
      runCount: 2,
      completedCount: 1,
      failedCount: 1,
      skippedOverlapCount: 2,
      lastRunStartedAt: generatedAt,
      lastRunCompletedAt: generatedAt,
      lastSkippedAt: null,
      lastExecutionId: "execution-latest",
      lastError: null,
    },
  },
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

function createFetchForConsoleData(calls: string[]) {
  return (async (input: RequestInfo | URL) => {
    const path = String(input);
    calls.push(path);

    if (path.includes("overview")) {
      return jsonResponse({ data: sampleConsoleData.overview });
    }
    if (path.includes("lifecycle")) {
      return jsonResponse({ data: sampleConsoleData.lifecycle });
    }
    if (path.includes("execution-health")) {
      return jsonResponse({ data: sampleConsoleData.executionHealth });
    }
    if (path.includes("accountability")) {
      return jsonResponse({ data: sampleConsoleData.accountability });
    }
    if (path.includes("scheduler/state")) {
      return jsonResponse({ data: sampleConsoleData.scheduler });
    }
    if (path.includes("escalations")) {
      return jsonResponse({ data: sampleConsoleData.escalations });
    }

    return jsonResponse(
      { error: { code: "NOT_FOUND", message: "Unhandled test path." } },
      404,
    );
  }) as typeof fetch;
}

describe("governance UI data layer", () => {
  test("derives RBAC-aware console capabilities", () => {
    assert.deepEqual(getGovernanceCapabilities("ADMIN"), {
      canControlScheduler: true,
      canDismissEscalations: true,
      canResolveEscalations: true,
      canRunEscalationCycle: true,
    });
    assert.deepEqual(getGovernanceCapabilities("MANAGER"), {
      canControlScheduler: false,
      canDismissEscalations: false,
      canResolveEscalations: true,
      canRunEscalationCycle: false,
    });
  });

  test("builds stable operational metric cards from API DTOs", () => {
    const cards = buildGovernanceMetricCards(sampleConsoleData);

    assert.deepEqual(
      cards.map((card) => [card.id, card.value]),
      [
        ["open-escalations", "2"],
        ["resolved-escalations", "1"],
        ["dismissed-escalations", "1"],
        ["execution-health", "50%"],
        ["notification-delivery", "50%"],
        ["scheduler-state", "Running"],
      ],
    );
    assert.match(getEscalationStatusTone(EscalationStatus.OPEN), /amber/);
  });

  test("fetches console data through governance APIs and omits scheduler for managers", async () => {
    const adminCalls: string[] = [];
    const managerCalls: string[] = [];

    const adminData = await fetchGovernanceConsoleData({
      includeScheduler: true,
      fetcher: createFetchForConsoleData(adminCalls),
    });
    const managerData = await fetchGovernanceConsoleData({
      includeScheduler: false,
      fetcher: createFetchForConsoleData(managerCalls),
    });

    assert.equal(adminData.scheduler.state?.isStarted, true);
    assert.ok(adminCalls.some((path) => path.includes("scheduler/state")));
    assert.equal(managerData.scheduler.registered, false);
    assert.equal(managerData.scheduler.state, null);
    assert.ok(!managerCalls.some((path) => path.includes("scheduler/state")));
  });

  test("sends lifecycle, execution, and scheduler actions to explicit API endpoints", async () => {
    const calls: Array<{ path: string; body: string | null; method: string }> = [];
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        path: String(input),
        body: typeof init?.body === "string" ? init.body : null,
        method: init?.method ?? "GET",
      });

      return jsonResponse({
        data: {
          executionId: "execution-api",
          status: "COMPLETED",
          triggerSource: "API",
          triggeredByUserId: "admin-user",
          startedAt: generatedAt,
          completedAt: generatedAt,
          summary: sampleConsoleData.executionHealth,
          errorSummary: null,
        },
      });
    }) as typeof fetch;

    await runEscalationCycleFromConsole({ dryRun: true, fetcher });
    await resolveEscalationFromConsole({
      escalationId: "log-open",
      reason: "Governance follow-up complete.",
      notes: "Reviewed with manager.",
      fetcher,
    });
    await startSchedulerFromConsole(fetcher);
    await stopSchedulerFromConsole(fetcher);

    assert.deepEqual(
      calls.map((call) => [call.method, call.path]),
      [
        ["POST", "/api/governance/executions/run"],
        ["POST", "/api/governance/escalations/log-open/resolve"],
        ["POST", "/api/governance/scheduler/start"],
        ["POST", "/api/governance/scheduler/stop"],
      ],
    );
    assert.equal(calls[0].body, JSON.stringify({ dryRun: true }));
    assert.equal(
      calls[1].body,
      JSON.stringify({
        reason: "Governance follow-up complete.",
        notes: "Reviewed with manager.",
      }),
    );
  });

  test("surfaces governance API errors with code and status", async () => {
    await assert.rejects(
      () =>
        requestGovernanceApi(
          "/api/governance/escalations",
          undefined,
          (async () =>
            jsonResponse(
              {
                error: {
                  code: "AUTHORIZATION_REQUIRED",
                  message: "Forbidden.",
                },
              },
              403,
            )) as typeof fetch,
        ),
      (error) => {
        assert.ok(error instanceof GovernanceConsoleApiError);
        assert.equal(error.code, "AUTHORIZATION_REQUIRED");
        assert.equal(error.status, 403);
        return true;
      },
    );
  });
});
