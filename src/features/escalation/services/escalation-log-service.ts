import { EscalationStatus } from "@prisma/client";

import type {
  EscalationDbClient,
  EscalationLogEnsureResult,
  EscalationViolation,
} from "@/features/escalation/types";

export async function ensureOpenEscalationLog(input: {
  db: EscalationDbClient;
  violation: EscalationViolation;
  triggeredAt: Date;
}): Promise<EscalationLogEnsureResult> {
  const { db, triggeredAt, violation } = input;
  const managerId = violation.managerId ?? null;
  const targetGoalId = violation.targetGoalId ?? null;

  const duplicateOpenLog = await db.escalationLog.findFirst({
    where: {
      escalationRuleId: violation.rule.id,
      escalationType: violation.rule.type,
      status: EscalationStatus.OPEN,
      employeeId: violation.employeeId,
      managerId,
      targetGoalId,
    },
    select: { id: true },
  });

  if (duplicateOpenLog) {
    return {
      ruleId: violation.rule.id,
      escalationType: violation.rule.type,
      escalationLevel: violation.rule.escalationLevel,
      employeeId: violation.employeeId,
      managerId,
      targetGoalId,
      created: false,
      duplicateLogId: duplicateOpenLog.id,
    };
  }

  const escalationLog = await db.escalationLog.create({
    data: {
      escalationRuleId: violation.rule.id,
      escalationType: violation.rule.type,
      escalationLevel: violation.rule.escalationLevel,
      status: EscalationStatus.OPEN,
      triggeredAt,
      employeeId: violation.employeeId,
      managerId,
      targetGoalId,
      message: violation.message,
      metadata: violation.metadata,
    },
    select: { id: true },
  });

  return {
    ruleId: violation.rule.id,
    escalationType: violation.rule.type,
    escalationLevel: violation.rule.escalationLevel,
    employeeId: violation.employeeId,
    managerId,
    targetGoalId,
    created: true,
    logId: escalationLog.id,
  };
}
