import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import {
  EscalationNotificationChannel,
  EscalationNotificationStatus,
  EscalationStatus,
  EscalationType,
  GoalStatus,
  UserRole,
} from "@prisma/client";

import { orchestrateEscalationNotificationsWithClient } from "@/features/escalation/services/escalation-notification-orchestration-service";
import {
  BASE_NOW,
  ACTIVE_CYCLE_START,
  daysAfter,
  escalationLog,
  escalationNotificationDelivery,
  escalationRule,
  goal,
} from "@/features/escalation/__tests__/fixtures/escalation-fixtures";
import { createEscalationTestDb } from "@/features/escalation/__tests__/helpers/in-memory-escalation-db";
import { createCapturingProvider } from "@/features/escalation/__tests__/helpers/notification-providers";

const originalAppBaseUrl = process.env.APP_BASE_URL;

afterEach(() => {
  if (originalAppBaseUrl === undefined) {
    delete process.env.APP_BASE_URL;
    return;
  }

  process.env.APP_BASE_URL = originalAppBaseUrl;
});

describe("orchestrateEscalationNotificationsWithClient", () => {
  test("delivers open escalation through Email and Teams and records delivery state", async () => {
    const rule = escalationRule();
    const log = escalationLog({
      escalationRuleId: rule.id,
      escalationType: EscalationType.GOAL_NOT_SUBMITTED,
      escalationLevel: rule.escalationLevel,
    });
    const emailProvider = createCapturingProvider({ name: "Email" });
    const teamsProvider = createCapturingProvider({ name: "Teams" });
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
      escalationLogs: [log],
    });

    const result = await orchestrateEscalationNotificationsWithClient({
      db,
      providers: [emailProvider, teamsProvider],
      attemptedAt: BASE_NOW,
    });

    assert.equal(result.openEscalationCount, 1);
    assert.equal(result.eligibleEscalationCount, 1);
    assert.equal(result.attemptedDeliveryCount, 2);
    assert.equal(result.deliveredCount, 2);
    assert.equal(emailProvider.sentPayloads.length, 1);
    assert.equal(teamsProvider.sentPayloads.length, 1);
    assert.deepEqual(
      state.escalationNotificationDeliveries.map((delivery) => delivery.channel).sort(),
      [EscalationNotificationChannel.EMAIL, EscalationNotificationChannel.TEAMS].sort(),
    );
    assert.ok(
      state.escalationNotificationDeliveries.every(
        (delivery) => delivery.status === EscalationNotificationStatus.DELIVERED,
      ),
    );
  });

  test("targets manager for approval-pending escalation and includes approval deep link", async () => {
    process.env.APP_BASE_URL = "https://atomquest.example.com";
    const rule = escalationRule({
      id: "rule-approval-pending",
      type: EscalationType.APPROVAL_PENDING_TOO_LONG,
      targetRole: UserRole.MANAGER,
    });
    const approvalGoal = goal({
      id: "goal-awaiting-approval",
      status: GoalStatus.SUBMITTED,
      submittedAt: daysAfter(ACTIVE_CYCLE_START, 1),
    });
    const log = escalationLog({
      id: "approval-escalation-log",
      escalationRuleId: rule.id,
      escalationType: EscalationType.APPROVAL_PENDING_TOO_LONG,
      escalationLevel: rule.escalationLevel,
      targetGoalId: approvalGoal.id,
      message:
        "Manager approval has remained pending longer than allowed by governance policy.",
    });
    const emailProvider = createCapturingProvider({ name: "Email" });
    const { db } = createEscalationTestDb({
      escalationRules: [rule],
      goals: [approvalGoal],
      escalationLogs: [log],
    });

    await orchestrateEscalationNotificationsWithClient({
      db,
      providers: [emailProvider],
      attemptedAt: BASE_NOW,
    });

    const payload = emailProvider.sentPayloads[0];

    assert.equal(payload.recipient.id, "manager-product");
    assert.equal(payload.metadata?.escalationLogId, "approval-escalation-log");
    assert.equal(payload.metadata?.goalId, "goal-awaiting-approval");
    assert.equal(
      payload.metadata?.deepLinkUrl,
      "https://atomquest.example.com/dashboard/manager/approvals#goal-goal-awaiting-approval&escalation-approval-escalation-log",
    );
  });

  test("targets employee for missed check-in escalation and includes check-in deep link", async () => {
    process.env.APP_BASE_URL = "https://atomquest.example.com";
    const rule = escalationRule({
      id: "rule-checkin-missed",
      type: EscalationType.CHECKIN_MISSED,
    });
    const checkinGoal = goal({
      id: "goal-missed-checkin",
      status: GoalStatus.APPROVED,
    });
    const log = escalationLog({
      id: "checkin-escalation-log",
      escalationRuleId: rule.id,
      escalationType: EscalationType.CHECKIN_MISSED,
      escalationLevel: rule.escalationLevel,
      targetGoalId: checkinGoal.id,
      message: "Quarterly check-in was not completed within the active review window.",
    });
    const teamsProvider = createCapturingProvider({ name: "Teams" });
    const { db } = createEscalationTestDb({
      escalationRules: [rule],
      goals: [checkinGoal],
      escalationLogs: [log],
    });

    await orchestrateEscalationNotificationsWithClient({
      db,
      providers: [teamsProvider],
      attemptedAt: BASE_NOW,
    });

    const payload = teamsProvider.sentPayloads[0];

    assert.equal(payload.recipient.id, "employee-product");
    assert.equal(
      payload.metadata?.deepLinkUrl,
      "https://atomquest.example.com/dashboard/employee/quarterly-updates#goal-goal-missed-checkin&escalation-checkin-escalation-log",
    );
  });

  test("does not resend when delivery already exists for same escalation channel and recipient", async () => {
    const rule = escalationRule();
    const log = escalationLog({
      escalationRuleId: rule.id,
      escalationType: rule.type,
      escalationLevel: rule.escalationLevel,
    });
    const emailProvider = createCapturingProvider({ name: "Email" });
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
      escalationLogs: [log],
      escalationNotificationDeliveries: [
        escalationNotificationDelivery({
          escalationLogId: log.id,
          channel: EscalationNotificationChannel.EMAIL,
          recipientUserId: "employee-product",
          providerName: "Email",
        }),
      ],
    });

    const result = await orchestrateEscalationNotificationsWithClient({
      db,
      providers: [emailProvider],
      attemptedAt: BASE_NOW,
    });

    assert.equal(result.duplicateCount, 1);
    assert.equal(result.attemptedDeliveryCount, 0);
    assert.equal(emailProvider.sentPayloads.length, 0);
    assert.equal(state.escalationNotificationDeliveries.length, 1);
  });

  test("records skipped and failed provider outcomes without retry behavior", async () => {
    const rule = escalationRule();
    const log = escalationLog({
      escalationRuleId: rule.id,
      escalationType: rule.type,
      escalationLevel: rule.escalationLevel,
    });
    const skippedEmail = createCapturingProvider({
      name: "Email",
      status: "skipped",
      error: "No recipient email provided",
    });
    const failedTeams = createCapturingProvider({
      name: "Teams",
      status: "failed",
      error: "Webhook unavailable",
    });
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
      escalationLogs: [log],
    });

    const result = await orchestrateEscalationNotificationsWithClient({
      db,
      providers: [skippedEmail, failedTeams],
      attemptedAt: BASE_NOW,
    });

    assert.equal(result.skippedCount, 1);
    assert.equal(result.failedCount, 1);
    assert.equal(state.escalationNotificationDeliveries.length, 2);
    assert.deepEqual(
      state.escalationNotificationDeliveries.map((delivery) => delivery.status).sort(),
      [
        EscalationNotificationStatus.FAILED,
        EscalationNotificationStatus.SKIPPED,
      ].sort(),
    );
  });

  test("ignores resolved escalation logs", async () => {
    const rule = escalationRule();
    const emailProvider = createCapturingProvider({ name: "Email" });
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
      escalationLogs: [
        escalationLog({
          escalationRuleId: rule.id,
          status: EscalationStatus.RESOLVED,
        }),
      ],
    });

    const result = await orchestrateEscalationNotificationsWithClient({
      db,
      providers: [emailProvider],
      attemptedAt: BASE_NOW,
    });

    assert.equal(result.openEscalationCount, 0);
    assert.equal(result.attemptedDeliveryCount, 0);
    assert.equal(emailProvider.sentPayloads.length, 0);
    assert.equal(state.escalationNotificationDeliveries.length, 0);
  });

  test("repeated orchestration run is idempotent for existing delivery state", async () => {
    const rule = escalationRule();
    const log = escalationLog({
      escalationRuleId: rule.id,
      escalationType: rule.type,
      escalationLevel: rule.escalationLevel,
    });
    const emailProvider = createCapturingProvider({ name: "Email" });
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
      escalationLogs: [log],
    });

    const firstRun = await orchestrateEscalationNotificationsWithClient({
      db,
      providers: [emailProvider],
      attemptedAt: BASE_NOW,
    });
    const secondRun = await orchestrateEscalationNotificationsWithClient({
      db,
      providers: [emailProvider],
      attemptedAt: daysAfter(BASE_NOW, 1),
    });

    assert.equal(firstRun.deliveredCount, 1);
    assert.equal(secondRun.deliveredCount, 0);
    assert.equal(secondRun.duplicateCount, 1);
    assert.equal(emailProvider.sentPayloads.length, 1);
    assert.equal(state.escalationNotificationDeliveries.length, 1);
  });
});
