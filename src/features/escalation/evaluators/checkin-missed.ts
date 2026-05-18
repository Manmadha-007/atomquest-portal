import { GoalStatus, UserRole, type Prisma } from "@prisma/client";

import { ensureOpenEscalationLog } from "@/features/escalation/services/escalation-log-service";
import type {
  ActiveEscalationRule,
  EscalationDbClient,
  EscalationRuleEvaluationResult,
} from "@/features/escalation/types";
import { addDays, daysBetween, hasReachedThresholdDate } from "@/features/escalation/utils/date-utils";
import { findReviewCyclesForRule } from "@/features/escalation/utils/review-cycle-scope";

export async function evaluateCheckinMissed(input: {
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

    const goalsMissingCheckins = await db.goal.findMany({
      where: {
        reviewCycleId: reviewCycle.id,
        isArchived: false,
        status: GoalStatus.APPROVED,
        parentGoalId: null,
        isPrimaryOwner: true,
        owner: {
          isActive: true,
          role: targetRole,
          ...(rule.departmentScope
            ? { department: rule.departmentScope }
            : {}),
        },
        updates: {
          none: {
            quarter: reviewCycle.quarter,
          },
        },
      },
      select: {
        id: true,
        title: true,
        ownerId: true,
        owner: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            department: true,
            managerId: true,
          },
        },
      },
      orderBy: [
        { owner: { department: "asc" } },
        { owner: { lastName: "asc" } },
        { title: "asc" },
      ],
    });

    evaluatedContextCount += goalsMissingCheckins.length;

    for (const goal of goalsMissingCheckins) {
      const employeeName = `${goal.owner.firstName} ${goal.owner.lastName}`.trim();
      const metadata = {
        evaluator: "evaluateCheckinMissed",
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
        expectedUpdateQuarter: reviewCycle.quarter,
        goalId: goal.id,
        goalTitle: goal.title,
        employeeName,
        employeeEmail: goal.owner.email,
        employeeDepartment: goal.owner.department,
        departmentScope: rule.departmentScope ?? null,
        targetRole,
      } satisfies Prisma.JsonObject;

      logResults.push(
        await ensureOpenEscalationLog({
          db,
          triggeredAt: now,
          violation: {
            rule,
            employeeId: goal.ownerId,
            managerId: goal.owner.managerId,
            targetGoalId: goal.id,
            message: "Quarterly check-in window closed without completion.",
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
