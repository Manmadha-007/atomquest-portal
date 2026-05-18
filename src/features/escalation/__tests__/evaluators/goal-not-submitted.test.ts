import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { EscalationType, UserRole } from "@prisma/client";

import { evaluateGoalNotSubmitted } from "@/features/escalation/evaluators/goal-not-submitted";
import {
  ACTIVE_CYCLE_START,
  PRIOR_CYCLE_ID,
  daysAfter,
  employee,
  escalationRule,
  goal,
  millisecondsBefore,
  reviewCycle,
} from "@/features/escalation/__tests__/fixtures/escalation-fixtures";
import { createEscalationTestDb } from "@/features/escalation/__tests__/helpers/in-memory-escalation-db";

describe("evaluateGoalNotSubmitted", () => {
  test("creates escalation when goal submission threshold is exactly reached", async () => {
    const rule = escalationRule();
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
    });

    const result = await evaluateGoalNotSubmitted({
      db,
      rule,
      now: daysAfter(ACTIVE_CYCLE_START, rule.thresholdDays),
    });

    assert.equal(result.createdLogCount, 1);
    assert.equal(state.escalationLogs.length, 1);
    assert.equal(state.escalationLogs[0].employeeId, "employee-product");
    assert.equal(state.escalationLogs[0].escalationType, EscalationType.GOAL_NOT_SUBMITTED);
    assert.match(
      state.escalationLogs[0].message,
      /Goal submission remained overdue for 3 days beyond cycle open/,
    );
  });

  test("does not escalate one millisecond before goal submission threshold", async () => {
    const rule = escalationRule();
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
    });

    const result = await evaluateGoalNotSubmitted({
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

  test("creates escalation when goal submission threshold is exceeded", async () => {
    const rule = escalationRule();
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
    });

    const result = await evaluateGoalNotSubmitted({
      db,
      rule,
      now: daysAfter(ACTIVE_CYCLE_START, rule.thresholdDays + 1),
    });

    assert.equal(result.createdLogCount, 1);
    assert.equal(state.escalationLogs.length, 1);
  });

  test("does not escalate employee with a submitted goal in scope", async () => {
    const rule = escalationRule();
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
      goals: [
        goal({
          status: "SUBMITTED",
          submittedAt: daysAfter(ACTIVE_CYCLE_START, 1),
        }),
      ],
    });

    const result = await evaluateGoalNotSubmitted({
      db,
      rule,
      now: daysAfter(ACTIVE_CYCLE_START, 5),
    });

    assert.equal(result.createdLogCount, 0);
    assert.equal(state.escalationLogs.length, 0);
  });

  test("applies departmentScope to goal submission governance", async () => {
    const productEmployee = employee();
    const financeEmployee = employee({
      id: "employee-finance",
      firstName: "Fiona",
      lastName: "Chen",
      email: "fiona.chen@example.com",
      department: "Finance",
    });
    const rule = escalationRule({
      departmentScope: "Finance",
    });
    const { db, state } = createEscalationTestDb({
      users: [productEmployee, financeEmployee],
      escalationRules: [rule],
    });

    const result = await evaluateGoalNotSubmitted({
      db,
      rule,
      now: daysAfter(ACTIVE_CYCLE_START, 5),
    });

    assert.equal(result.createdLogCount, 1);
    assert.equal(state.escalationLogs[0].employeeId, "employee-finance");
  });

  test("applies targetRole and excludes managers when rule targets employees", async () => {
    const managerWithoutSubmission = employee({
      id: "manager-product",
      role: UserRole.MANAGER,
      managerId: null,
    });
    const rule = escalationRule({
      targetRole: UserRole.EMPLOYEE,
    });
    const { db, state } = createEscalationTestDb({
      users: [managerWithoutSubmission],
      escalationRules: [rule],
    });

    const result = await evaluateGoalNotSubmitted({
      db,
      rule,
      now: daysAfter(ACTIVE_CYCLE_START, 5),
    });

    assert.equal(result.createdLogCount, 0);
    assert.equal(state.escalationLogs.length, 0);
  });

  test("uses explicit reviewCycleId scope instead of active-cycle fallback", async () => {
    const inactivePriorCycle = reviewCycle({
      id: PRIOR_CYCLE_ID,
      name: "Q1 2026 Operating Cycle",
      quarter: 1,
      startDate: new Date("2026-01-01T09:00:00.000Z"),
      endDate: new Date("2026-03-31T09:00:00.000Z"),
      isActive: false,
    });
    const activeCycle = reviewCycle({
      startDate: new Date("2026-05-10T09:00:00.000Z"),
    });
    const rule = escalationRule({
      reviewCycleId: PRIOR_CYCLE_ID,
    });
    const { db, state } = createEscalationTestDb({
      reviewCycles: [activeCycle, inactivePriorCycle],
      escalationRules: [rule],
    });

    const result = await evaluateGoalNotSubmitted({
      db,
      rule,
      now: new Date("2026-05-10T09:00:00.000Z"),
    });

    assert.equal(result.createdLogCount, 1);
    assert.equal(state.escalationLogs[0].metadata?.reviewCycleId, PRIOR_CYCLE_ID);
  });

  test("falls back only to active review cycles when no reviewCycleId is configured", async () => {
    const inactivePriorCycle = reviewCycle({
      id: PRIOR_CYCLE_ID,
      name: "Q1 2026 Operating Cycle",
      quarter: 1,
      startDate: new Date("2026-01-01T09:00:00.000Z"),
      endDate: new Date("2026-03-31T09:00:00.000Z"),
      isActive: false,
    });
    const activeCycle = reviewCycle({
      startDate: new Date("2026-05-10T09:00:00.000Z"),
    });
    const rule = escalationRule();
    const { db, state } = createEscalationTestDb({
      reviewCycles: [inactivePriorCycle, activeCycle],
      escalationRules: [rule],
    });

    const result = await evaluateGoalNotSubmitted({
      db,
      rule,
      now: new Date("2026-05-10T09:00:00.000Z"),
    });

    assert.equal(result.createdLogCount, 0);
    assert.equal(result.skippedReason, "THRESHOLD_NOT_REACHED");
    assert.equal(state.escalationLogs.length, 0);
  });
});
