import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { ApprovalDecision, EscalationType, GoalStatus, UserRole } from "@prisma/client";

import { evaluateApprovalPendingTooLong } from "@/features/escalation/evaluators/approval-pending-too-long";
import {
  ACTIVE_CYCLE_START,
  approval,
  daysAfter,
  employee,
  escalationRule,
  goal,
  manager,
  millisecondsBefore,
} from "@/features/escalation/__tests__/fixtures/escalation-fixtures";
import { createEscalationTestDb } from "@/features/escalation/__tests__/helpers/in-memory-escalation-db";

describe("evaluateApprovalPendingTooLong", () => {
  test("creates escalation when approval pending threshold is exactly reached", async () => {
    const submittedAt = daysAfter(ACTIVE_CYCLE_START, 1);
    const rule = escalationRule({
      id: "rule-approval-pending",
      type: EscalationType.APPROVAL_PENDING_TOO_LONG,
      name: "Approval pending after 2 days",
      thresholdDays: 2,
      targetRole: UserRole.MANAGER,
    });
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
      goals: [
        goal({
          status: GoalStatus.SUBMITTED,
          submittedAt,
        }),
      ],
      goalApprovals: [
        approval({
          createdAt: submittedAt,
        }),
      ],
    });

    const result = await evaluateApprovalPendingTooLong({
      db,
      rule,
      now: daysAfter(submittedAt, rule.thresholdDays),
    });

    assert.equal(result.createdLogCount, 1);
    assert.equal(state.escalationLogs.length, 1);
    assert.equal(state.escalationLogs[0].employeeId, "employee-product");
    assert.equal(state.escalationLogs[0].managerId, "manager-product");
    assert.equal(state.escalationLogs[0].targetGoalId, "goal-product-reliability");
  });

  test("does not escalate one millisecond before approval pending threshold", async () => {
    const submittedAt = daysAfter(ACTIVE_CYCLE_START, 1);
    const rule = escalationRule({
      id: "rule-approval-pending",
      type: EscalationType.APPROVAL_PENDING_TOO_LONG,
      thresholdDays: 2,
      targetRole: UserRole.MANAGER,
    });
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
      goals: [
        goal({
          status: GoalStatus.SUBMITTED,
          submittedAt,
        }),
      ],
      goalApprovals: [
        approval({
          createdAt: submittedAt,
        }),
      ],
    });

    const result = await evaluateApprovalPendingTooLong({
      db,
      rule,
      now: millisecondsBefore(daysAfter(submittedAt, rule.thresholdDays), 1),
    });

    assert.equal(result.createdLogCount, 0);
    assert.equal(state.escalationLogs.length, 0);
  });

  test("creates escalation when approval pending threshold is exceeded", async () => {
    const submittedAt = daysAfter(ACTIVE_CYCLE_START, 1);
    const rule = escalationRule({
      id: "rule-approval-pending",
      type: EscalationType.APPROVAL_PENDING_TOO_LONG,
      thresholdDays: 2,
      targetRole: UserRole.MANAGER,
    });
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
      goals: [
        goal({
          status: GoalStatus.SUBMITTED,
          submittedAt,
        }),
      ],
      goalApprovals: [
        approval({
          createdAt: submittedAt,
        }),
      ],
    });

    const result = await evaluateApprovalPendingTooLong({
      db,
      rule,
      now: daysAfter(submittedAt, rule.thresholdDays + 1),
    });

    assert.equal(result.createdLogCount, 1);
    assert.match(
      state.escalationLogs[0].message,
      /Manager approval remained pending beyond the configured 2 days threshold/,
    );
  });

  test("does not escalate approvals that are no longer pending", async () => {
    const submittedAt = daysAfter(ACTIVE_CYCLE_START, 1);
    const rule = escalationRule({
      id: "rule-approval-pending",
      type: EscalationType.APPROVAL_PENDING_TOO_LONG,
      thresholdDays: 2,
      targetRole: UserRole.MANAGER,
    });
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
      goals: [
        goal({
          status: GoalStatus.APPROVED,
          submittedAt,
        }),
      ],
      goalApprovals: [
        approval({
          createdAt: submittedAt,
          decision: ApprovalDecision.APPROVED,
          decidedAt: daysAfter(submittedAt, 1),
        }),
      ],
    });

    const result = await evaluateApprovalPendingTooLong({
      db,
      rule,
      now: daysAfter(submittedAt, 5),
    });

    assert.equal(result.createdLogCount, 0);
    assert.equal(state.escalationLogs.length, 0);
  });

  test("applies departmentScope to the goal owner department", async () => {
    const submittedAt = daysAfter(ACTIVE_CYCLE_START, 1);
    const productOwner = employee();
    const financeOwner = employee({
      id: "employee-finance",
      firstName: "Fiona",
      lastName: "Chen",
      email: "fiona.chen@example.com",
      department: "Finance",
    });
    const rule = escalationRule({
      id: "rule-approval-pending",
      type: EscalationType.APPROVAL_PENDING_TOO_LONG,
      thresholdDays: 2,
      targetRole: UserRole.MANAGER,
      departmentScope: "Finance",
    });
    const { db, state } = createEscalationTestDb({
      users: [manager(), productOwner, financeOwner],
      escalationRules: [rule],
      goals: [
        goal({
          id: "goal-product",
          ownerId: productOwner.id,
          status: GoalStatus.SUBMITTED,
          submittedAt,
        }),
        goal({
          id: "goal-finance",
          title: "Improve forecast accuracy",
          ownerId: financeOwner.id,
          status: GoalStatus.SUBMITTED,
          submittedAt,
        }),
      ],
      goalApprovals: [
        approval({
          id: "approval-product",
          goalId: "goal-product",
          createdAt: submittedAt,
        }),
        approval({
          id: "approval-finance",
          goalId: "goal-finance",
          createdAt: submittedAt,
        }),
      ],
    });

    const result = await evaluateApprovalPendingTooLong({
      db,
      rule,
      now: daysAfter(submittedAt, 3),
    });

    assert.equal(result.createdLogCount, 1);
    assert.equal(state.escalationLogs[0].employeeId, "employee-finance");
    assert.equal(state.escalationLogs[0].targetGoalId, "goal-finance");
  });

  test("applies targetRole to approvers", async () => {
    const submittedAt = daysAfter(ACTIVE_CYCLE_START, 1);
    const inactiveApproverRole = manager({
      id: "admin-reviewer",
      role: UserRole.ADMIN,
    });
    const rule = escalationRule({
      id: "rule-approval-pending",
      type: EscalationType.APPROVAL_PENDING_TOO_LONG,
      thresholdDays: 2,
      targetRole: UserRole.MANAGER,
    });
    const { db, state } = createEscalationTestDb({
      users: [inactiveApproverRole, employee()],
      escalationRules: [rule],
      goals: [
        goal({
          status: GoalStatus.SUBMITTED,
          submittedAt,
        }),
      ],
      goalApprovals: [
        approval({
          approverId: "admin-reviewer",
          createdAt: submittedAt,
        }),
      ],
    });

    const result = await evaluateApprovalPendingTooLong({
      db,
      rule,
      now: daysAfter(submittedAt, 3),
    });

    assert.equal(result.createdLogCount, 0);
    assert.equal(state.escalationLogs.length, 0);
  });

  test("does not create duplicate OPEN escalation for same approval violation", async () => {
    const submittedAt = daysAfter(ACTIVE_CYCLE_START, 1);
    const rule = escalationRule({
      id: "rule-approval-pending",
      type: EscalationType.APPROVAL_PENDING_TOO_LONG,
      thresholdDays: 2,
      targetRole: UserRole.MANAGER,
    });
    const { db, state } = createEscalationTestDb({
      escalationRules: [rule],
      goals: [
        goal({
          status: GoalStatus.SUBMITTED,
          submittedAt,
        }),
      ],
      goalApprovals: [
        approval({
          createdAt: submittedAt,
        }),
      ],
    });

    const firstRun = await evaluateApprovalPendingTooLong({
      db,
      rule,
      now: daysAfter(submittedAt, 3),
    });
    const secondRun = await evaluateApprovalPendingTooLong({
      db,
      rule,
      now: daysAfter(submittedAt, 4),
    });

    assert.equal(firstRun.createdLogCount, 1);
    assert.equal(secondRun.createdLogCount, 0);
    assert.equal(secondRun.skippedDuplicateCount, 1);
    assert.equal(state.escalationLogs.length, 1);
  });
});
