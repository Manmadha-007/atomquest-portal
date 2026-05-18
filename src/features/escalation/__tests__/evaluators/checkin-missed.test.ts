import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { EscalationType, GoalStatus, UserRole } from "@prisma/client";

import { evaluateCheckinMissed } from "@/features/escalation/evaluators/checkin-missed";
import {
  ACTIVE_CYCLE_START,
  daysAfter,
  employee,
  escalationRule,
  goal,
  goalUpdate,
  manager,
  millisecondsBefore,
} from "@/features/escalation/__tests__/fixtures/escalation-fixtures";
import { createEscalationTestDb } from "@/features/escalation/__tests__/helpers/in-memory-escalation-db";

describe("evaluateCheckinMissed", () => {
  test("creates escalation when check-in threshold is exactly reached", async () => {
    const rule = escalationRule({
      id: "rule-checkin-missed",
      type: EscalationType.CHECKIN_MISSED,
      name: "Check-in overdue after 5 days",
      thresholdDays: 5,
      targetRole: UserRole.EMPLOYEE,
    });
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
      goals: [
        goal({
          status: GoalStatus.APPROVED,
          submittedAt: daysAfter(ACTIVE_CYCLE_START, 1),
        }),
      ],
    });

    const result = await evaluateCheckinMissed({
      db,
      rule,
      now: daysAfter(ACTIVE_CYCLE_START, rule.thresholdDays),
    });

    assert.equal(result.createdLogCount, 1);
    assert.equal(state.escalationLogs[0].targetGoalId, "goal-product-reliability");
    assert.equal(
      state.escalationLogs[0].message,
      "Quarterly check-in window closed without completion.",
    );
  });

  test("does not escalate one millisecond before check-in threshold", async () => {
    const rule = escalationRule({
      id: "rule-checkin-missed",
      type: EscalationType.CHECKIN_MISSED,
      thresholdDays: 5,
      targetRole: UserRole.EMPLOYEE,
    });
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
      goals: [
        goal({
          status: GoalStatus.APPROVED,
          submittedAt: daysAfter(ACTIVE_CYCLE_START, 1),
        }),
      ],
    });

    const result = await evaluateCheckinMissed({
      db,
      rule,
      now: millisecondsBefore(
        daysAfter(ACTIVE_CYCLE_START, rule.thresholdDays),
        1,
      ),
    });

    assert.equal(result.createdLogCount, 0);
    assert.equal(result.skippedReason, "THRESHOLD_NOT_REACHED");
    assert.equal(state.escalationLogs.length, 0);
  });

  test("creates escalation when check-in threshold is exceeded", async () => {
    const rule = escalationRule({
      id: "rule-checkin-missed",
      type: EscalationType.CHECKIN_MISSED,
      thresholdDays: 5,
      targetRole: UserRole.EMPLOYEE,
    });
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
      goals: [
        goal({
          status: GoalStatus.APPROVED,
          submittedAt: daysAfter(ACTIVE_CYCLE_START, 1),
        }),
      ],
    });

    const result = await evaluateCheckinMissed({
      db,
      rule,
      now: daysAfter(ACTIVE_CYCLE_START, rule.thresholdDays + 1),
    });

    assert.equal(result.createdLogCount, 1);
    assert.equal(state.escalationLogs.length, 1);
  });

  test("does not escalate approved goal with a quarterly update in the active quarter", async () => {
    const rule = escalationRule({
      id: "rule-checkin-missed",
      type: EscalationType.CHECKIN_MISSED,
      thresholdDays: 5,
      targetRole: UserRole.EMPLOYEE,
    });
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
      goals: [
        goal({
          status: GoalStatus.APPROVED,
          submittedAt: daysAfter(ACTIVE_CYCLE_START, 1),
        }),
      ],
      goalUpdates: [goalUpdate()],
    });

    const result = await evaluateCheckinMissed({
      db,
      rule,
      now: daysAfter(ACTIVE_CYCLE_START, 7),
    });

    assert.equal(result.createdLogCount, 0);
    assert.equal(state.escalationLogs.length, 0);
  });

  test("does not escalate non-approved goals for missed check-ins", async () => {
    const rule = escalationRule({
      id: "rule-checkin-missed",
      type: EscalationType.CHECKIN_MISSED,
      thresholdDays: 5,
      targetRole: UserRole.EMPLOYEE,
    });
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
      goals: [
        goal({
          status: GoalStatus.SUBMITTED,
          submittedAt: daysAfter(ACTIVE_CYCLE_START, 1),
        }),
      ],
    });

    const result = await evaluateCheckinMissed({
      db,
      rule,
      now: daysAfter(ACTIVE_CYCLE_START, 7),
    });

    assert.equal(result.createdLogCount, 0);
    assert.equal(state.escalationLogs.length, 0);
  });

  test("applies departmentScope to check-in owner selection", async () => {
    const productOwner = employee();
    const financeOwner = employee({
      id: "employee-finance",
      firstName: "Fiona",
      lastName: "Chen",
      email: "fiona.chen@example.com",
      department: "Finance",
    });
    const rule = escalationRule({
      id: "rule-checkin-missed",
      type: EscalationType.CHECKIN_MISSED,
      thresholdDays: 5,
      targetRole: UserRole.EMPLOYEE,
      departmentScope: "Finance",
    });
    const { db, state } = createEscalationTestDb({
      users: [manager(), productOwner, financeOwner],
      escalationRules: [rule],
      goals: [
        goal({
          id: "goal-product",
          ownerId: productOwner.id,
          status: GoalStatus.APPROVED,
        }),
        goal({
          id: "goal-finance",
          title: "Improve forecast accuracy",
          ownerId: financeOwner.id,
          status: GoalStatus.APPROVED,
        }),
      ],
    });

    const result = await evaluateCheckinMissed({
      db,
      rule,
      now: daysAfter(ACTIVE_CYCLE_START, 7),
    });

    assert.equal(result.createdLogCount, 1);
    assert.equal(state.escalationLogs[0].employeeId, "employee-finance");
    assert.equal(state.escalationLogs[0].targetGoalId, "goal-finance");
  });

  test("excludes shared child goals from missed check-in escalation", async () => {
    const rule = escalationRule({
      id: "rule-checkin-missed",
      type: EscalationType.CHECKIN_MISSED,
      thresholdDays: 5,
      targetRole: UserRole.EMPLOYEE,
    });
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
      goals: [
        goal({
          id: "shared-child-goal",
          status: GoalStatus.APPROVED,
          parentGoalId: "primary-shared-goal",
          isPrimaryOwner: false,
        }),
      ],
    });

    const result = await evaluateCheckinMissed({
      db,
      rule,
      now: daysAfter(ACTIVE_CYCLE_START, 7),
    });

    assert.equal(result.createdLogCount, 0);
    assert.equal(state.escalationLogs.length, 0);
  });

  test("does not create duplicate OPEN escalation for same missed check-in", async () => {
    const rule = escalationRule({
      id: "rule-checkin-missed",
      type: EscalationType.CHECKIN_MISSED,
      thresholdDays: 5,
      targetRole: UserRole.EMPLOYEE,
    });
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
      goals: [
        goal({
          status: GoalStatus.APPROVED,
          submittedAt: daysAfter(ACTIVE_CYCLE_START, 1),
        }),
      ],
    });

    const firstRun = await evaluateCheckinMissed({
      db,
      rule,
      now: daysAfter(ACTIVE_CYCLE_START, 7),
    });
    const secondRun = await evaluateCheckinMissed({
      db,
      rule,
      now: daysAfter(ACTIVE_CYCLE_START, 8),
    });

    assert.equal(firstRun.createdLogCount, 1);
    assert.equal(secondRun.createdLogCount, 0);
    assert.equal(secondRun.skippedDuplicateCount, 1);
    assert.equal(state.escalationLogs.length, 1);
  });
});
