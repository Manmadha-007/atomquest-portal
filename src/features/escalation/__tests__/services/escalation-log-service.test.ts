import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { EscalationStatus } from "@prisma/client";

import { ensureOpenEscalationLog } from "@/features/escalation/services/escalation-log-service";
import {
  BASE_NOW,
  escalationLog,
  escalationRule,
} from "@/features/escalation/__tests__/fixtures/escalation-fixtures";
import { createEscalationTestDb } from "@/features/escalation/__tests__/helpers/in-memory-escalation-db";

describe("ensureOpenEscalationLog", () => {
  test("creates OPEN escalation log when no matching violation is open", async () => {
    const rule = escalationRule();
    const { db, state } = createEscalationTestDb();

    const result = await ensureOpenEscalationLog({
      db,
      triggeredAt: BASE_NOW,
      violation: {
        rule,
        employeeId: "employee-product",
        managerId: "manager-product",
        targetGoalId: null,
        message: "Goal submission remained overdue for 3 days beyond cycle open.",
        metadata: {
          evaluator: "test",
          thresholdDays: 3,
        },
      },
    });

    assert.equal(result.created, true);
    assert.equal(state.escalationLogs.length, 1);
    assert.equal(state.escalationLogs[0].status, EscalationStatus.OPEN);
    assert.equal(state.escalationLogs[0].escalationRuleId, rule.id);
  });

  test("does not create duplicate OPEN escalation for the same target context", async () => {
    const rule = escalationRule();
    const { db, state } = createEscalationTestDb({
      escalationLogs: [
        escalationLog({
          escalationRuleId: rule.id,
          escalationType: rule.type,
          escalationLevel: rule.escalationLevel,
        }),
      ],
    });

    const result = await ensureOpenEscalationLog({
      db,
      triggeredAt: BASE_NOW,
      violation: {
        rule,
        employeeId: "employee-product",
        managerId: "manager-product",
        targetGoalId: null,
        message: "Goal submission remained overdue for 3 days beyond cycle open.",
      },
    });

    assert.equal(result.created, false);
    assert.equal(result.duplicateLogId, "existing-escalation-log");
    assert.equal(state.escalationLogs.length, 1);
  });

  test("creates a new escalation when prior matching escalation is resolved", async () => {
    const rule = escalationRule();
    const { db, state } = createEscalationTestDb({
      escalationLogs: [
        escalationLog({
          escalationRuleId: rule.id,
          escalationType: rule.type,
          escalationLevel: rule.escalationLevel,
          status: EscalationStatus.RESOLVED,
          resolvedAt: BASE_NOW,
        }),
      ],
    });

    const result = await ensureOpenEscalationLog({
      db,
      triggeredAt: BASE_NOW,
      violation: {
        rule,
        employeeId: "employee-product",
        managerId: "manager-product",
        targetGoalId: null,
        message: "Goal submission remained overdue for 3 days beyond cycle open.",
      },
    });

    assert.equal(result.created, true);
    assert.equal(state.escalationLogs.length, 2);
    assert.equal(state.escalationLogs[1].status, EscalationStatus.OPEN);
  });

  test("sequential repeated calls remain idempotent for an OPEN violation", async () => {
    const rule = escalationRule();
    const { db, state } = createEscalationTestDb();
    const violation = {
      rule,
      employeeId: "employee-product",
      managerId: "manager-product",
      targetGoalId: null,
      message: "Goal submission remained overdue for 3 days beyond cycle open.",
    };

    const first = await ensureOpenEscalationLog({
      db,
      triggeredAt: BASE_NOW,
      violation,
    });
    const second = await ensureOpenEscalationLog({
      db,
      triggeredAt: BASE_NOW,
      violation,
    });

    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(state.escalationLogs.length, 1);
  });
});
