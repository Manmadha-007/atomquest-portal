import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { EscalationType, GoalStatus, UserRole } from "@prisma/client";

import { evaluateEscalationsWithClient } from "@/features/escalation/services/escalation-evaluation-service";
import {
  ACTIVE_CYCLE_START,
  approval,
  daysAfter,
  employee,
  escalationRule,
  goal,
  manager,
} from "@/features/escalation/__tests__/fixtures/escalation-fixtures";
import { createEscalationTestDb } from "@/features/escalation/__tests__/helpers/in-memory-escalation-db";

describe("evaluateEscalationsWithClient", () => {
  test("routes active rules to deterministic evaluators and creates expected logs", async () => {
    const submittedAt = daysAfter(ACTIVE_CYCLE_START, 1);
    const goalSubmissionRule = escalationRule({
      id: "rule-goal-not-submitted",
      type: EscalationType.GOAL_NOT_SUBMITTED,
      thresholdDays: 3,
      targetRole: UserRole.EMPLOYEE,
    });
    const approvalRule = escalationRule({
      id: "rule-approval-pending",
      type: EscalationType.APPROVAL_PENDING_TOO_LONG,
      thresholdDays: 2,
      targetRole: UserRole.MANAGER,
    });
    const checkinRule = escalationRule({
      id: "rule-checkin-missed",
      type: EscalationType.CHECKIN_MISSED,
      thresholdDays: 5,
      targetRole: UserRole.EMPLOYEE,
    });
    const inactiveRule = escalationRule({
      id: "inactive-rule",
      type: EscalationType.GOAL_NOT_SUBMITTED,
      isActive: false,
    });
    const { db, state } = createEscalationTestDb({
      users: [
        manager(),
        employee({
          id: "employee-no-submission",
          firstName: "Nora",
          lastName: "Singh",
          email: "nora.singh@example.com",
        }),
        employee({
          id: "employee-pending-approval",
          firstName: "Priya",
          lastName: "Rao",
          email: "priya.rao@example.com",
        }),
        employee({
          id: "employee-missed-checkin",
          firstName: "Luis",
          lastName: "Garcia",
          email: "luis.garcia@example.com",
        }),
      ],
      escalationRules: [
        goalSubmissionRule,
        approvalRule,
        checkinRule,
        inactiveRule,
      ],
      goals: [
        goal({
          id: "goal-pending-approval",
          ownerId: "employee-pending-approval",
          status: GoalStatus.SUBMITTED,
          submittedAt,
        }),
        goal({
          id: "goal-missed-checkin",
          ownerId: "employee-missed-checkin",
          status: GoalStatus.APPROVED,
          submittedAt,
        }),
      ],
      goalApprovals: [
        approval({
          id: "approval-pending",
          goalId: "goal-pending-approval",
          createdAt: submittedAt,
        }),
      ],
    });

    const result = await evaluateEscalationsWithClient({
      db,
      now: daysAfter(ACTIVE_CYCLE_START, 7),
    });

    assert.equal(result.activeRuleCount, 3);
    assert.equal(result.evaluatedRuleCount, 3);
    assert.equal(result.createdLogCount, 3);
    assert.equal(state.escalationLogs.length, 3);
    assert.deepEqual(
      state.escalationLogs.map((log) => log.escalationType).sort(),
      [
        EscalationType.APPROVAL_PENDING_TOO_LONG,
        EscalationType.CHECKIN_MISSED,
        EscalationType.GOAL_NOT_SUBMITTED,
      ].sort(),
    );
  });

  test("running evaluation twice does not create duplicate OPEN escalation logs", async () => {
    const rule = escalationRule();
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
    });

    const firstRun = await evaluateEscalationsWithClient({
      db,
      now: daysAfter(ACTIVE_CYCLE_START, 5),
    });
    const secondRun = await evaluateEscalationsWithClient({
      db,
      now: daysAfter(ACTIVE_CYCLE_START, 6),
    });

    assert.equal(firstRun.createdLogCount, 1);
    assert.equal(firstRun.skippedDuplicateCount, 0);
    assert.equal(secondRun.createdLogCount, 0);
    assert.equal(secondRun.skippedDuplicateCount, 1);
    assert.equal(state.escalationLogs.length, 1);
  });

  test("evaluation remains stable when no active rules exist", async () => {
    const { db, state } = createEscalationTestDb({
      escalationRules: [
        escalationRule({
          id: "inactive-rule",
          isActive: false,
        }),
      ],
    });

    const result = await evaluateEscalationsWithClient({
      db,
      now: daysAfter(ACTIVE_CYCLE_START, 5),
    });

    assert.equal(result.activeRuleCount, 0);
    assert.equal(result.createdLogCount, 0);
    assert.equal(state.escalationLogs.length, 0);
  });
});
