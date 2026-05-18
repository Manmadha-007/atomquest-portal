import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  EscalationExecutionStatus,
  EscalationTriggerSource,
} from "@prisma/client";

import { runEscalationCycleWithClient } from "@/features/escalation/services/escalation-cycle-service";
import {
  ACTIVE_CYCLE_START,
  daysAfter,
  employee,
  escalationRule,
  manager,
} from "@/features/escalation/__tests__/fixtures/escalation-fixtures";
import { createEscalationTestDb } from "@/features/escalation/__tests__/helpers/in-memory-escalation-db";
import { createCapturingProvider } from "@/features/escalation/__tests__/helpers/notification-providers";

describe("runEscalationCycleWithClient", () => {
  test("creates execution record and completes successful controlled invocation", async () => {
    const rule = escalationRule();
    const emailProvider = createCapturingProvider({ name: "Email" });
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
    });

    const result = await runEscalationCycleWithClient({
      db,
      triggerSource: EscalationTriggerSource.MANUAL,
      triggeredByUserId: "admin-user",
      now: daysAfter(ACTIVE_CYCLE_START, 5),
      providers: [emailProvider],
      metadata: {
        reason: "manual governance verification",
      },
    });

    assert.equal(result.status, EscalationExecutionStatus.COMPLETED);
    assert.equal(result.triggerSource, EscalationTriggerSource.MANUAL);
    assert.equal(result.triggeredByUserId, "admin-user");
    assert.deepEqual(result.summary, {
      rulesEvaluated: 1,
      violationsDetected: 1,
      logsCreated: 1,
      evaluationDuplicates: 0,
      notificationsAttempted: 1,
      notificationsDelivered: 1,
      notificationsSkipped: 0,
      notificationDuplicates: 0,
      failures: 0,
    });
    assert.equal(state.escalationExecutions.length, 1);
    assert.equal(state.escalationExecutions[0].status, EscalationExecutionStatus.COMPLETED);
    assert.equal(state.escalationExecutions[0].rulesEvaluated, 1);
    assert.equal(state.escalationExecutions[0].logsCreated, 1);
    assert.equal(state.escalationExecutions[0].notificationsDelivered, 1);
    assert.equal(state.escalationExecutions[0].metadata?.reason, "manual governance verification");
    assert.equal(state.escalationLogs.length, 1);
    assert.equal(state.escalationNotificationDeliveries.length, 1);
  });

  test("marks execution partially completed when notification delivery fails", async () => {
    const rule = escalationRule();
    const failedTeamsProvider = createCapturingProvider({
      name: "Teams",
      status: "failed",
      error: "Webhook unavailable",
    });
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
    });

    const result = await runEscalationCycleWithClient({
      db,
      triggerSource: EscalationTriggerSource.API,
      now: daysAfter(ACTIVE_CYCLE_START, 5),
      providers: [failedTeamsProvider],
    });

    assert.equal(result.status, EscalationExecutionStatus.PARTIALLY_COMPLETED);
    assert.equal(result.summary.rulesEvaluated, 1);
    assert.equal(result.summary.logsCreated, 1);
    assert.equal(result.summary.failures, 1);
    assert.equal(result.summary.notificationsDelivered, 0);
    assert.equal(state.escalationExecutions[0].status, EscalationExecutionStatus.PARTIALLY_COMPLETED);
    assert.equal(state.escalationExecutions[0].failures, 1);
    assert.equal(state.escalationExecutions[0].errorSummary, null);
  });

  test("persists failed execution when evaluation throws", async () => {
    const rule = escalationRule();
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
    });

    (
      db as unknown as {
        escalationRule: { findMany: () => Promise<never> };
      }
    ).escalationRule.findMany = async () => {
      throw new Error("Evaluation query failed");
    };

    const result = await runEscalationCycleWithClient({
      db,
      triggerSource: EscalationTriggerSource.CLI,
      now: daysAfter(ACTIVE_CYCLE_START, 5),
      providers: [],
    });

    assert.equal(result.status, EscalationExecutionStatus.FAILED);
    assert.equal(result.errorSummary, "Evaluation query failed");
    assert.equal(result.summary.failures, 1);
    assert.equal(state.escalationExecutions.length, 1);
    assert.equal(state.escalationExecutions[0].status, EscalationExecutionStatus.FAILED);
    assert.equal(state.escalationExecutions[0].errorSummary, "Evaluation query failed");
    assert.equal(state.escalationExecutions[0].failures, 1);
    assert.equal(state.escalationLogs.length, 0);
  });

  test("repeated controlled invocations remain idempotent for logs and notifications", async () => {
    const rule = escalationRule();
    const emailProvider = createCapturingProvider({ name: "Email" });
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
    });

    const firstRun = await runEscalationCycleWithClient({
      db,
      triggerSource: EscalationTriggerSource.SYSTEM,
      now: daysAfter(ACTIVE_CYCLE_START, 5),
      providers: [emailProvider],
    });
    const secondRun = await runEscalationCycleWithClient({
      db,
      triggerSource: EscalationTriggerSource.SYSTEM,
      now: daysAfter(ACTIVE_CYCLE_START, 6),
      providers: [emailProvider],
    });

    assert.equal(firstRun.summary.logsCreated, 1);
    assert.equal(firstRun.summary.notificationsDelivered, 1);
    assert.equal(secondRun.summary.logsCreated, 0);
    assert.equal(secondRun.summary.evaluationDuplicates, 1);
    assert.equal(secondRun.summary.notificationsAttempted, 0);
    assert.equal(secondRun.summary.notificationDuplicates, 1);
    assert.equal(state.escalationExecutions.length, 2);
    assert.equal(state.escalationLogs.length, 1);
    assert.equal(state.escalationNotificationDeliveries.length, 1);
    assert.equal(emailProvider.sentPayloads.length, 1);
  });

  test("completes multi-log governance execution with delivery audit persistence", async () => {
    const employees = Array.from({ length: 20 }, (_, index) =>
      employee({
        id: `employee-notification-${index + 1}`,
        firstName: `Notification${index + 1}`,
        lastName: "Governance",
        email: `notification.${index + 1}@example.com`,
      }),
    );
    const emailProvider = createCapturingProvider({ name: "Email" });
    const { db, state } = createEscalationTestDb({
      users: [manager(), ...employees],
      escalationRules: [escalationRule()],
    });

    const result = await runEscalationCycleWithClient({
      db,
      triggerSource: EscalationTriggerSource.SYSTEM,
      now: daysAfter(ACTIVE_CYCLE_START, 5),
      providers: [emailProvider],
    });

    assert.equal(result.status, EscalationExecutionStatus.COMPLETED);
    assert.equal(result.summary.logsCreated, employees.length);
    assert.equal(result.summary.notificationsAttempted, employees.length);
    assert.equal(result.summary.notificationsDelivered, employees.length);
    assert.equal(result.summary.notificationDuplicates, 0);
    assert.equal(result.summary.failures, 0);
    assert.equal(state.escalationLogs.length, employees.length);
    assert.equal(state.escalationNotificationDeliveries.length, employees.length);
    assert.equal(emailProvider.sentPayloads.length, employees.length);
  });
});
