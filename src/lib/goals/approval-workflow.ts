import {
  ApprovalDecision,
  GoalStatus,
  Prisma,
  UserRole,
  type Goal,
  type PrismaClient,
} from "@prisma/client";
import { z } from "zod";
import {
  ApprovalDecisionKind,
  GoalApprovalActionResult,
} from "./approval-ui";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;



export function getApprovalRevalidationPaths(ownerId: string) {
  return [
    "/dashboard/manager",
    "/dashboard/manager/team-goals",
    "/dashboard/manager/approvals",
    "/dashboard/employee",
    `/dashboard/employee/${ownerId}`,
  ];
}

function getDecisionStatus(decision: ApprovalDecisionKind) {
  return decision === ApprovalDecision.APPROVED
    ? GoalStatus.APPROVED
    : GoalStatus.REJECTED;
}

function getDecisionTimestampField(decision: ApprovalDecisionKind) {
  return decision === ApprovalDecision.APPROVED
    ? { approvedAt: new Date(), rejectedAt: null }
    : { rejectedAt: new Date(), approvedAt: null };
}

function getAuditAction(decision: ApprovalDecisionKind) {
  return decision === ApprovalDecision.APPROVED
    ? "GOAL_APPROVED"
    : "GOAL_REJECTED";
}

function getSuccessMessage(decision: ApprovalDecisionKind) {
  return decision === ApprovalDecision.APPROVED
    ? "Goal approved and locked for employee editing."
    : "Goal rejected and returned to employee editing.";
}

export function canManagerReviewGoal(
  managerId: string,
  goal: Pick<Goal, "status" | "ownerId"> & {
    owner: { managerId: string | null; isActive: boolean };
  },
) {
  return (
    goal.status === GoalStatus.SUBMITTED &&
    goal.ownerId !== managerId &&
    goal.owner.isActive &&
    goal.owner.managerId === managerId
  );
}

export async function decideGoalApproval(input: {
  tx: TransactionClient;
  managerId: string;
  managerRole: UserRole;
  goalId: string;
  decision: ApprovalDecisionKind;
  comments: string | null;
}): Promise<GoalApprovalActionResult & { ownerId?: string }> {
  const { tx, managerId, managerRole, goalId, decision, comments } = input;

  if (managerRole !== UserRole.MANAGER) {
    return {
      ok: false,
      message: "Only managers can review submitted goals.",
    };
  }

  const goal = await tx.goal.findUnique({
    where: { id: goalId },
    select: {
      id: true,
      title: true,
      status: true,
      version: true,
      ownerId: true,
      reviewCycleId: true,
      isArchived: true,
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          managerId: true,
          isActive: true,
        },
      },
    },
  });

  if (!goal || goal.isArchived) {
    return {
      ok: false,
      message: "Goal was not found in the active approval workflow.",
    };
  }

  if (!canManagerReviewGoal(managerId, goal)) {
    return {
      ok: false,
      message:
        goal.status !== GoalStatus.SUBMITTED
          ? "Only submitted goals can be reviewed."
          : "You can only review goals for your direct reports.",
    };
  }

  const decidedAt = new Date();
  const nextStatus = getDecisionStatus(decision);

  await tx.goal.update({
    where: { id: goal.id },
    data: {
      status: nextStatus,
      ...getDecisionTimestampField(decision),
    },
    select: { id: true },
  });

  const approval = await tx.goalApproval.upsert({
    where: {
      goalId_approverId_version_stepOrder: {
        goalId: goal.id,
        approverId: managerId,
        version: goal.version,
        stepOrder: 1,
      },
    },
    create: {
      goalId: goal.id,
      approverId: managerId,
      version: goal.version,
      stepOrder: 1,
      decision,
      comments,
      decidedAt,
    },
    update: {
      decision,
      comments,
      decidedAt,
    },
    select: { id: true },
  });

  await tx.auditLog.create({
    data: {
      actorId: managerId,
      goalId: goal.id,
      entityType: "GoalApproval",
      entityId: approval.id,
      action: getAuditAction(decision),
      metadata: {
        goalId: goal.id,
        goalTitle: goal.title,
        ownerId: goal.ownerId,
        ownerName: `${goal.owner.firstName} ${goal.owner.lastName}`.trim(),
        reviewCycleId: goal.reviewCycleId,
        version: goal.version,
        decision,
        commentsProvided: Boolean(comments),
        previousStatus: GoalStatus.SUBMITTED,
        nextStatus,
      } satisfies Prisma.JsonObject,
    },
  });

  return {
    ok: true,
    message: getSuccessMessage(decision),
    approvalId: approval.id,
    ownerId: goal.ownerId,
  };
}
