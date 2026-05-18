import { UserRole, type Prisma } from "@prisma/client";

import { ensureOpenEscalationLog } from "@/features/escalation/services/escalation-log-service";
import type {
  ActiveEscalationRule,
  EscalationDbClient,
  EscalationRuleEvaluationResult,
} from "@/features/escalation/types";
import { addDays, daysBetween, hasReachedThresholdDate } from "@/features/escalation/utils/date-utils";
import { findReviewCyclesForRule } from "@/features/escalation/utils/review-cycle-scope";

function formatDayLabel(days: number) {
  return days === 1 ? "day" : "days";
}

export async function evaluateGoalNotSubmitted(input: {
  db: EscalationDbClient;
  rule: ActiveEscalationRule;
  now: Date;
}): Promise<EscalationRuleEvaluationResult> {
  const { db, now, rule } = input;
  const targetRole = rule.targetRole ?? UserRole.EMPLOYEE;
  const reviewCycles = await findReviewCyclesForRule({ db, rule });
  const logResults: EscalationRuleEvaluationResult["logResults"] = [];
  let evaluatedContextCount = 0;
  let thresholdReached = false;

  if (reviewCycles.length === 0) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      escalationType: rule.type,
      escalationLevel: rule.escalationLevel,
      targetRole,
      evaluatedAt: now,
      evaluatedContextCount,
      createdLogCount: 0,
      skippedDuplicateCount: 0,
      skippedReason: "NO_REVIEW_CYCLE_SCOPE",
      logResults,
    };
  }

  for (const reviewCycle of reviewCycles) {
    if (
      !hasReachedThresholdDate({
        from: reviewCycle.startDate,
        thresholdDays: rule.thresholdDays,
        now,
      })
    ) {
      continue;
    }

    thresholdReached = true;
    const thresholdDate = addDays(reviewCycle.startDate, rule.thresholdDays);

    const overdueEmployees = await db.user.findMany({
      where: {
        isActive: true,
        role: targetRole,
        ...(rule.departmentScope
          ? { department: rule.departmentScope }
          : {}),
        goalsOwned: {
          none: {
            reviewCycleId: reviewCycle.id,
            isArchived: false,
            submittedAt: { not: null },
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        department: true,
        managerId: true,
      },
      orderBy: [
        { department: "asc" },
        { lastName: "asc" },
        { firstName: "asc" },
      ],
    });

    evaluatedContextCount += overdueEmployees.length;

    for (const employee of overdueEmployees) {
      const employeeName = `${employee.firstName} ${employee.lastName}`.trim();
      const metadata = {
        evaluator: "evaluateGoalNotSubmitted",
        ruleName: rule.name,
        thresholdDays: rule.thresholdDays,
        elapsedDays: daysBetween(reviewCycle.startDate, now),
        thresholdDate: thresholdDate.toISOString(),
        reviewCycleId: reviewCycle.id,
        reviewCycleName: reviewCycle.name,
        reviewCycleYear: reviewCycle.year,
        reviewCycleQuarter: reviewCycle.quarter,
        cycleStartDate: reviewCycle.startDate.toISOString(),
        cycleEndDate: reviewCycle.endDate.toISOString(),
        employeeName,
        employeeEmail: employee.email,
        employeeDepartment: employee.department,
        departmentScope: rule.departmentScope ?? null,
        targetRole,
      } satisfies Prisma.JsonObject;

      logResults.push(
        await ensureOpenEscalationLog({
          db,
          triggeredAt: now,
          violation: {
            rule,
            employeeId: employee.id,
            managerId: employee.managerId,
            targetGoalId: null,
            message: `Goal submission remained overdue for ${rule.thresholdDays} ${formatDayLabel(rule.thresholdDays)} beyond cycle open.`,
            metadata,
          },
        }),
      );
    }
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    escalationType: rule.type,
    escalationLevel: rule.escalationLevel,
    targetRole,
    evaluatedAt: now,
    evaluatedContextCount,
    createdLogCount: logResults.filter((result) => result.created).length,
    skippedDuplicateCount: logResults.filter((result) => !result.created).length,
    skippedReason: thresholdReached ? undefined : "THRESHOLD_NOT_REACHED",
    logResults,
  };
}
