import { EscalationType, Prisma } from "@prisma/client";

import { evaluateApprovalPendingTooLong } from "@/features/escalation/evaluators/approval-pending-too-long";
import { evaluateCheckinMissed } from "@/features/escalation/evaluators/checkin-missed";
import { evaluateGoalNotSubmitted } from "@/features/escalation/evaluators/goal-not-submitted";
import type {
  ActiveEscalationRule,
  EscalationDbClient,
  EscalationEvaluationRunResult,
  EscalationRuleEvaluationResult,
} from "@/features/escalation/types";

const activeEscalationRuleSelect = {
  id: true,
  type: true,
  name: true,
  description: true,
  thresholdDays: true,
  escalationLevel: true,
  targetRole: true,
  reviewCycleId: true,
  departmentScope: true,
} as const satisfies Prisma.EscalationRuleSelect;

function assertSupportedEscalationType(value: never): never {
  throw new Error(`Unsupported escalation type: ${value}`);
}

async function loadActiveEscalationRules(
  db: EscalationDbClient,
): Promise<ActiveEscalationRule[]> {
  return db.escalationRule.findMany({
    where: { isActive: true },
    orderBy: [
      { type: "asc" },
      { escalationLevel: "asc" },
      { createdAt: "asc" },
    ],
    select: activeEscalationRuleSelect,
  });
}

async function evaluateRule(input: {
  db: EscalationDbClient;
  rule: ActiveEscalationRule;
  now: Date;
}): Promise<EscalationRuleEvaluationResult> {
  switch (input.rule.type) {
    case EscalationType.GOAL_NOT_SUBMITTED:
      return evaluateGoalNotSubmitted(input);

    case EscalationType.APPROVAL_PENDING_TOO_LONG:
      return evaluateApprovalPendingTooLong(input);

    case EscalationType.CHECKIN_MISSED:
      return evaluateCheckinMissed(input);

    default:
      return assertSupportedEscalationType(input.rule.type);
  }
}

export async function evaluateEscalationsWithClient(input: {
  db: EscalationDbClient;
  now?: Date;
}): Promise<EscalationEvaluationRunResult> {
  const now = input.now ?? new Date();
  const activeRules = await loadActiveEscalationRules(input.db);
  const results: EscalationRuleEvaluationResult[] = [];

  for (const rule of activeRules) {
    results.push(
      await evaluateRule({
        db: input.db,
        rule,
        now,
      }),
    );
  }

  return {
    evaluatedAt: now,
    activeRuleCount: activeRules.length,
    evaluatedRuleCount: results.length,
    createdLogCount: results.reduce(
      (count, result) => count + result.createdLogCount,
      0,
    ),
    skippedDuplicateCount: results.reduce(
      (count, result) => count + result.skippedDuplicateCount,
      0,
    ),
    results,
  };
}

export async function evaluateEscalations(input?: {
  db?: EscalationDbClient;
  now?: Date;
}): Promise<EscalationEvaluationRunResult> {
  const now = input?.now ?? new Date();

  if (input?.db) {
    return evaluateEscalationsWithClient({
      db: input.db,
      now,
    });
  }

  const { prisma } = await import("@/lib/prisma");

  return prisma.$transaction(
    (tx) =>
      evaluateEscalationsWithClient({
        db: tx,
        now,
      }),
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}
