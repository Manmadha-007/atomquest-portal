import { ApprovalDecision, GoalStatus, UserRole, type Prisma } from "@prisma/client";

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

export async function evaluateApprovalPendingTooLong(input: {
  db: EscalationDbClient;
  rule: ActiveEscalationRule;
  now: Date;
}): Promise<EscalationRuleEvaluationResult> {
  const { db, now, rule } = input;
  const targetRole = rule.targetRole ?? UserRole.MANAGER;
  const reviewCycles = await findReviewCyclesForRule({ db, rule });
  const logResults: EscalationRuleEvaluationResult["logResults"] = [];
  let evaluatedContextCount = 0;

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
    const pendingApprovals = await db.goalApproval.findMany({
      where: {
        decision: ApprovalDecision.PENDING,
        decidedAt: null,
        approver: {
          isActive: true,
          role: targetRole,
        },
        goal: {
          reviewCycleId: reviewCycle.id,
          isArchived: false,
          status: GoalStatus.SUBMITTED,
          owner: {
            isActive: true,
            ...(rule.departmentScope
              ? { department: rule.departmentScope }
              : {}),
          },
        },
      },
      select: {
        id: true,
        createdAt: true,
        version: true,
        stepOrder: true,
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
          },
        },
        goal: {
          select: {
            id: true,
            title: true,
            submittedAt: true,
            ownerId: true,
            owner: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                department: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    for (const approval of pendingApprovals) {
      const pendingSince = approval.goal.submittedAt ?? approval.createdAt;

      if (
        !hasReachedThresholdDate({
          from: pendingSince,
          thresholdDays: rule.thresholdDays,
          now,
        })
      ) {
        continue;
      }

      evaluatedContextCount++;

      const thresholdDate = addDays(pendingSince, rule.thresholdDays);
      const employeeName =
        `${approval.goal.owner.firstName} ${approval.goal.owner.lastName}`.trim();
      const managerName =
        `${approval.approver.firstName} ${approval.approver.lastName}`.trim();
      const metadata = {
        evaluator: "evaluateApprovalPendingTooLong",
        ruleName: rule.name,
        thresholdDays: rule.thresholdDays,
        elapsedDays: daysBetween(pendingSince, now),
        thresholdDate: thresholdDate.toISOString(),
        approvalId: approval.id,
        approvalCreatedAt: approval.createdAt.toISOString(),
        approvalVersion: approval.version,
        approvalStepOrder: approval.stepOrder,
        pendingSince: pendingSince.toISOString(),
        reviewCycleId: reviewCycle.id,
        reviewCycleName: reviewCycle.name,
        reviewCycleYear: reviewCycle.year,
        reviewCycleQuarter: reviewCycle.quarter,
        goalId: approval.goal.id,
        goalTitle: approval.goal.title,
        employeeName,
        employeeEmail: approval.goal.owner.email,
        employeeDepartment: approval.goal.owner.department,
        managerName,
        managerEmail: approval.approver.email,
        managerDepartment: approval.approver.department,
        departmentScope: rule.departmentScope ?? null,
        targetRole,
      } satisfies Prisma.JsonObject;

      logResults.push(
        await ensureOpenEscalationLog({
          db,
          triggeredAt: now,
          violation: {
            rule,
            employeeId: approval.goal.ownerId,
            managerId: approval.approver.id,
            targetGoalId: approval.goal.id,
            message: `Manager approval remained pending beyond the configured ${rule.thresholdDays} ${formatDayLabel(rule.thresholdDays)} threshold.`,
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
    logResults,
  };
}
