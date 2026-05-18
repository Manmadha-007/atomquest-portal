import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  EscalationExecutionStatus,
  EscalationLevel,
  EscalationStatus,
  EscalationTriggerSource,
  EscalationType,
  UserRole,
} from "@prisma/client";

import {
  getEscalationLifecycleMetricsWithClient,
  getEscalationOverviewMetricsWithClient,
  getExecutionHealthMetricsWithClient,
  getGovernanceAccountabilityMetricsWithClient,
  getGovernanceDashboardMetricsWithClient,
} from "@/features/escalation/services/escalation-analytics-service";
import {
  ACTIVE_CYCLE_ID,
  ACTIVE_CYCLE_START,
  BASE_NOW,
  PRIOR_CYCLE_ID,
  daysAfter,
  employee,
  escalationExecution,
  escalationLog,
  escalationRule,
  goal,
  manager,
  reviewCycle,
} from "@/features/escalation/__tests__/fixtures/escalation-fixtures";
import { createEscalationTestDb } from "@/features/escalation/__tests__/helpers/in-memory-escalation-db";

const ANALYTICS_NOW = new Date("2026-05-20T09:00:00.000Z");

function analyticsState() {
  const productManager = manager();
  const salesManager = manager({
    id: "manager-sales",
    firstName: "Sofia",
    lastName: "Garcia",
    email: "sofia.garcia@example.com",
    department: "Sales",
  });
  const governanceAdmin = manager({
    id: "governance-admin",
    firstName: "Asha",
    lastName: "Rao",
    email: "asha.rao@example.com",
    department: "People Operations",
    role: UserRole.ADMIN,
  });
  const productEmployee = employee();
  const salesEmployee = employee({
    id: "employee-sales",
    firstName: "Nina",
    lastName: "Brooks",
    email: "nina.brooks@example.com",
    department: "Sales",
    managerId: "manager-sales",
  });
  const activeCycle = reviewCycle();
  const priorCycle = reviewCycle({
    id: PRIOR_CYCLE_ID,
    name: "Q1 2026 Operating Cycle",
    year: 2026,
    quarter: 1,
    startDate: new Date("2026-01-01T09:00:00.000Z"),
    endDate: new Date("2026-03-31T09:00:00.000Z"),
    isActive: false,
  });
  const goalRule = escalationRule();
  const approvalRule = escalationRule({
    id: "rule-approval-pending",
    type: EscalationType.APPROVAL_PENDING_TOO_LONG,
    name: "Approval pending after 2 days",
    escalationLevel: EscalationLevel.LEVEL_2,
    targetRole: UserRole.MANAGER,
  });
  const checkinRule = escalationRule({
    id: "rule-checkin-missed",
    type: EscalationType.CHECKIN_MISSED,
    name: "Check-in overdue after 5 days",
    escalationLevel: EscalationLevel.LEVEL_3,
  });
  const activeSalesGoal = goal({
    id: "goal-sales-current",
    title: "Expand enterprise pipeline",
    ownerId: "employee-sales",
  });
  const priorProductGoal = goal({
    id: "goal-product-prior",
    title: "Improve Q1 reliability",
    reviewCycleId: PRIOR_CYCLE_ID,
  });

  return {
    users: [productManager, salesManager, governanceAdmin, productEmployee, salesEmployee],
    reviewCycles: [activeCycle, priorCycle],
    goals: [activeSalesGoal, priorProductGoal],
    escalationRules: [goalRule, approvalRule, checkinRule],
    escalationLogs: [
      escalationLog({
        id: "log-open-goal-current",
        escalationRuleId: goalRule.id,
        escalationType: EscalationType.GOAL_NOT_SUBMITTED,
        escalationLevel: EscalationLevel.LEVEL_1,
        status: EscalationStatus.OPEN,
        triggeredAt: new Date("2026-05-05T09:00:00.000Z"),
        employeeId: "employee-product",
        managerId: "manager-product",
        metadata: {
          reviewCycleId: ACTIVE_CYCLE_ID,
          reviewCycleName: "Q2 2026 Operating Cycle",
          reviewCycleYear: 2026,
          reviewCycleQuarter: 2,
          employeeDepartment: "Product Engineering",
        },
      }),
      escalationLog({
        id: "log-resolved-goal-current",
        escalationRuleId: goalRule.id,
        escalationType: EscalationType.GOAL_NOT_SUBMITTED,
        escalationLevel: EscalationLevel.LEVEL_1,
        status: EscalationStatus.RESOLVED,
        triggeredAt: new Date("2026-05-01T09:00:00.000Z"),
        resolvedAt: new Date("2026-05-03T09:00:00.000Z"),
        resolvedByUserId: "manager-product",
        resolutionReason: "Manager approved overdue goal submission.",
        employeeId: "employee-product",
        managerId: "manager-product",
        metadata: {
          reviewCycleId: ACTIVE_CYCLE_ID,
          reviewCycleName: "Q2 2026 Operating Cycle",
          reviewCycleYear: 2026,
          reviewCycleQuarter: 2,
          employeeDepartment: "Product Engineering",
        },
      }),
      escalationLog({
        id: "log-dismissed-approval-current",
        escalationRuleId: approvalRule.id,
        escalationType: EscalationType.APPROVAL_PENDING_TOO_LONG,
        escalationLevel: EscalationLevel.LEVEL_2,
        status: EscalationStatus.DISMISSED,
        triggeredAt: new Date("2026-05-04T09:00:00.000Z"),
        dismissedAt: new Date("2026-05-06T09:00:00.000Z"),
        dismissedByUserId: "governance-admin",
        dismissalReason: "Approved exception window.",
        employeeId: "employee-sales",
        managerId: "manager-sales",
        targetGoalId: "goal-sales-current",
      }),
      escalationLog({
        id: "log-open-checkin-current",
        escalationRuleId: checkinRule.id,
        escalationType: EscalationType.CHECKIN_MISSED,
        escalationLevel: EscalationLevel.LEVEL_3,
        status: EscalationStatus.OPEN,
        triggeredAt: new Date("2026-05-08T09:00:00.000Z"),
        employeeId: "employee-sales",
        managerId: "manager-sales",
        targetGoalId: "goal-sales-current",
      }),
      escalationLog({
        id: "log-resolved-checkin-prior",
        escalationRuleId: checkinRule.id,
        escalationType: EscalationType.CHECKIN_MISSED,
        escalationLevel: EscalationLevel.LEVEL_3,
        status: EscalationStatus.RESOLVED,
        triggeredAt: new Date("2026-04-10T09:00:00.000Z"),
        resolvedAt: new Date("2026-04-20T09:00:00.000Z"),
        resolvedByUserId: "manager-product",
        resolutionReason: "Prior cycle check-in completed.",
        employeeId: "employee-product",
        managerId: "manager-product",
        targetGoalId: "goal-product-prior",
      }),
    ],
    escalationExecutions: [
      escalationExecution({
        id: "execution-system-completed",
        startedAt: new Date("2026-05-10T09:00:00.000Z"),
        completedAt: new Date("2026-05-10T09:00:01.000Z"),
        status: EscalationExecutionStatus.COMPLETED,
        triggerSource: EscalationTriggerSource.SYSTEM,
        rulesEvaluated: 3,
        violationsDetected: 4,
        logsCreated: 2,
        notificationsAttempted: 4,
        notificationsDelivered: 3,
        notificationsSkipped: 1,
        metadata: {
          scheduler: {
            skippedOverlapCount: 2,
          },
        },
      }),
      escalationExecution({
        id: "execution-system-failed",
        startedAt: new Date("2026-05-11T09:00:00.000Z"),
        completedAt: new Date("2026-05-11T09:00:02.000Z"),
        status: EscalationExecutionStatus.FAILED,
        triggerSource: EscalationTriggerSource.SYSTEM,
        failures: 1,
        errorSummary: "Evaluation query failed",
      }),
      escalationExecution({
        id: "execution-manual-partial",
        startedAt: new Date("2026-05-12T09:00:00.000Z"),
        completedAt: new Date("2026-05-12T09:00:03.000Z"),
        status: EscalationExecutionStatus.PARTIALLY_COMPLETED,
        triggerSource: EscalationTriggerSource.MANUAL,
        logsCreated: 1,
        notificationsAttempted: 2,
        notificationsDelivered: 1,
        failures: 1,
      }),
      escalationExecution({
        id: "execution-api-running",
        startedAt: new Date("2026-05-13T09:00:00.000Z"),
        completedAt: null,
        status: EscalationExecutionStatus.RUNNING,
        triggerSource: EscalationTriggerSource.API,
      }),
      escalationExecution({
        id: "execution-cli-old",
        startedAt: new Date("2026-04-01T09:00:00.000Z"),
        completedAt: new Date("2026-04-01T09:00:01.000Z"),
        status: EscalationExecutionStatus.COMPLETED,
        triggerSource: EscalationTriggerSource.CLI,
      }),
    ],
  };
}

describe("governance analytics services", () => {
  test("aggregates escalation overview metrics by status, type, level, and review cycle", async () => {
    const { db } = createEscalationTestDb(analyticsState());

    const metrics = await getEscalationOverviewMetricsWithClient({
      db,
      now: ANALYTICS_NOW,
    });

    assert.equal(metrics.totalEscalations, 5);
    assert.equal(metrics.openEscalations, 2);
    assert.equal(metrics.resolvedEscalations, 2);
    assert.equal(metrics.dismissedEscalations, 1);
    assert.equal(metrics.unresolvedEscalations, 2);
    assert.equal(
      metrics.byType.find(
        (item) => item.escalationType === EscalationType.GOAL_NOT_SUBMITTED,
      )?.count,
      2,
    );
    assert.equal(
      metrics.byType.find(
        (item) => item.escalationType === EscalationType.CHECKIN_MISSED,
      )?.resolvedCount,
      1,
    );
    assert.equal(
      metrics.byLevel.find((item) => item.escalationLevel === EscalationLevel.LEVEL_3)
        ?.count,
      2,
    );
    assert.deepEqual(
      metrics.byReviewCycle.map((item) => ({
        id: item.reviewCycleId,
        count: item.count,
      })),
      [
        { id: PRIOR_CYCLE_ID, count: 1 },
        { id: ACTIVE_CYCLE_ID, count: 4 },
      ],
    );
  });

  test("applies current review cycle and custom date window filtering deterministically", async () => {
    const { db } = createEscalationTestDb(analyticsState());

    const currentCycleMetrics = await getEscalationOverviewMetricsWithClient({
      db,
      now: ANALYTICS_NOW,
      timeWindow: { preset: "CURRENT_REVIEW_CYCLE" },
    });
    const customMetrics = await getEscalationOverviewMetricsWithClient({
      db,
      now: ANALYTICS_NOW,
      timeWindow: {
        preset: "CUSTOM",
        from: new Date("2026-05-04T00:00:00.000Z"),
        to: new Date("2026-05-08T23:59:59.999Z"),
        label: "Early May governance window",
      },
    });

    assert.equal(currentCycleMetrics.window.reviewCycleId, ACTIVE_CYCLE_ID);
    assert.equal(currentCycleMetrics.totalEscalations, 4);
    assert.equal(currentCycleMetrics.byReviewCycle.length, 1);
    assert.equal(currentCycleMetrics.byReviewCycle[0].reviewCycleId, ACTIVE_CYCLE_ID);
    assert.equal(customMetrics.window.label, "Early May governance window");
    assert.equal(customMetrics.totalEscalations, 3);
    assert.equal(customMetrics.openEscalations, 2);
  });

  test("calculates lifecycle closure, SLA, aging, and recurrence metrics", async () => {
    const { db } = createEscalationTestDb(analyticsState());

    const metrics = await getEscalationLifecycleMetricsWithClient({
      db,
      now: ANALYTICS_NOW,
      slaWindowDays: 7,
    });

    assert.equal(metrics.resolvedCount, 2);
    assert.equal(metrics.dismissedCount, 1);
    assert.equal(metrics.closedCount, 3);
    assert.equal(metrics.dismissalRatio, 0.33);
    assert.equal(metrics.meanResolutionHours, 144);
    assert.equal(metrics.meanDismissalHours, 48);
    assert.equal(metrics.meanClosureHours, 112);
    assert.equal(metrics.resolvedWithinSlaCount, 1);
    assert.equal(metrics.resolvedWithinSlaRatio, 0.5);
    assert.equal(metrics.unresolvedOpenCount, 2);
    assert.equal(metrics.meanOpenAgeDays, 13.5);
    assert.equal(metrics.oldestOpenEscalation?.escalationLogId, "log-open-goal-current");
    assert.equal(
      metrics.openEscalationAging.find((item) => item.bucket === "8_14_DAYS")
        ?.count,
      1,
    );
    assert.equal(
      metrics.openEscalationAging.find((item) => item.bucket === "15_PLUS_DAYS")
        ?.count,
      1,
    );
    assert.deepEqual(metrics.recurrence, [
      {
        escalationType: EscalationType.GOAL_NOT_SUBMITTED,
        employeeId: "employee-product",
        employeeName: "Evan Stone",
        managerId: "manager-product",
        managerName: "Maya Patel",
        targetGoalId: null,
        targetGoalTitle: null,
        occurrenceCount: 2,
        openCount: 1,
      },
    ]);
  });

  test("surfaces department, manager, ownership, and hotspot accountability metrics", async () => {
    const { db } = createEscalationTestDb(analyticsState());

    const metrics = await getGovernanceAccountabilityMetricsWithClient({
      db,
      now: ANALYTICS_NOW,
    });

    assert.deepEqual(metrics.escalationsByDepartment, [
      {
        department: "Product Engineering",
        totalEscalations: 3,
        openEscalations: 1,
        resolvedEscalations: 2,
        dismissedEscalations: 0,
      },
      {
        department: "Sales",
        totalEscalations: 2,
        openEscalations: 1,
        resolvedEscalations: 0,
        dismissedEscalations: 1,
      },
    ]);
    assert.deepEqual(
      metrics.unresolvedEscalationsByDepartment.map((item) => ({
        department: item.department,
        open: item.openEscalations,
      })),
      [
        { department: "Product Engineering", open: 1 },
        { department: "Sales", open: 1 },
      ],
    );
    assert.equal(metrics.escalationsByManager[0].managerId, "manager-product");
    assert.equal(metrics.escalationsByManager[0].meanResolutionHours, 144);
    assert.deepEqual(metrics.resolutionOwnership, [
      {
        userId: "manager-product",
        userName: "Maya Patel",
        department: "Product Engineering",
        resolvedCount: 2,
        dismissedCount: 0,
        totalClosedCount: 2,
      },
      {
        userId: "governance-admin",
        userName: "Asha Rao",
        department: "People Operations",
        resolvedCount: 0,
        dismissedCount: 1,
        totalClosedCount: 1,
      },
    ]);
    assert.equal(metrics.repeatEscalationHotspots.length, 1);
    assert.equal(metrics.repeatEscalationHotspots[0].occurrenceCount, 2);
  });

  test("aggregates execution health and notification delivery statistics", async () => {
    const { db } = createEscalationTestDb(analyticsState());

    const metrics = await getExecutionHealthMetricsWithClient({
      db,
      now: ANALYTICS_NOW,
      maxRecentExecutions: 2,
      timeWindow: {
        preset: "CUSTOM",
        from: daysAfter(ACTIVE_CYCLE_START, 8),
        to: ANALYTICS_NOW,
      },
    });

    assert.equal(metrics.totalExecutions, 4);
    assert.equal(metrics.completedExecutions, 1);
    assert.equal(metrics.failedExecutions, 1);
    assert.equal(metrics.partiallyCompletedExecutions, 1);
    assert.equal(metrics.runningExecutions, 1);
    assert.equal(metrics.scheduledExecutionCount, 2);
    assert.equal(metrics.successRatio, 0.25);
    assert.equal(metrics.failureRatio, 0.5);
    assert.equal(metrics.meanExecutionDurationMs, 2000);
    assert.equal(metrics.schedulerOverlapSkippedCount, 2);
    assert.equal(metrics.rulesEvaluated, 3);
    assert.equal(metrics.violationsDetected, 4);
    assert.equal(metrics.logsCreated, 3);
    assert.equal(metrics.notificationsAttempted, 6);
    assert.equal(metrics.notificationsDelivered, 4);
    assert.equal(metrics.notificationsSkipped, 1);
    assert.equal(metrics.notificationDeliverySuccessRatio, 0.67);
    assert.equal(metrics.failures, 2);
    assert.deepEqual(
      metrics.recentExecutions.map((execution) => execution.executionId),
      ["execution-api-running", "execution-manual-partial"],
    );
    assert.equal(
      metrics.byTriggerSource.find(
        (item) => item.triggerSource === EscalationTriggerSource.SYSTEM,
      )?.count,
      2,
    );
  });

  test("returns stable empty-state metrics for dashboard consumers", async () => {
    const { db } = createEscalationTestDb();

    const dashboard = await getGovernanceDashboardMetricsWithClient({
      db,
      now: BASE_NOW,
    });

    assert.equal(dashboard.overview.totalEscalations, 0);
    assert.equal(dashboard.lifecycle.meanResolutionHours, null);
    assert.equal(dashboard.lifecycle.oldestOpenEscalation, null);
    assert.equal(dashboard.executionHealth.totalExecutions, 0);
    assert.equal(dashboard.executionHealth.successRatio, 0);
    assert.deepEqual(dashboard.accountability.escalationsByDepartment, []);
  });
});
