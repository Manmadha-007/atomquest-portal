import {
  GoalStatus,
  Prisma,
  QuarterlyStatus,
  UserRole,
  type PrismaClient,
} from "@prisma/client";
import { z } from "zod";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export type GovernanceActionResult = {
  ok: boolean;
  message: string;
  id?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const reviewCycleActivationSchema = z.object({
  reviewCycleId: z.string().uuid("A valid review cycle is required."),
  isActive: z.boolean(),
});

export const goalLockSchema = z.object({
  goalId: z.string().uuid("A valid goal is required."),
  locked: z.boolean(),
  reason: z
    .string()
    .trim()
    .max(500, "Reason must be 500 characters or fewer.")
    .optional()
    .transform((value) => value || null),
});

export type ReviewCycleActivationInput = z.infer<
  typeof reviewCycleActivationSchema
>;
export type GoalLockInput = z.input<typeof goalLockSchema>;

export function isAdminRole(role?: UserRole | null) {
  return role === UserRole.ADMIN;
}

export function assertAdminAction(role?: UserRole | null): GovernanceActionResult | null {
  if (!isAdminRole(role)) {
    return {
      ok: false,
      message: "Only administrators can perform governance actions.",
    };
  }

  return null;
}

export function getGovernanceRevalidationPaths() {
  return [
    "/dashboard/admin/review-cycles",
    "/dashboard/admin/audit-logs",
    "/dashboard/admin/analytics",
    "/dashboard/employee",
    "/dashboard/employee/quarterly-updates",
    "/dashboard/manager/team-goals",
    "/dashboard/manager/approvals",
    "/dashboard/manager/analytics",
  ];
}

export function getCycleStatusLabel(status: QuarterlyStatus) {
  const labels = {
    [QuarterlyStatus.NOT_STARTED]: "Not started",
    [QuarterlyStatus.ON_TRACK]: "On track",
    [QuarterlyStatus.COMPLETED]: "Completed",
    [QuarterlyStatus.DELAYED]: "Delayed",
  } satisfies Record<QuarterlyStatus, string>;

  return labels[status];
}

export async function setReviewCycleActivation(input: {
  tx: TransactionClient;
  actorId: string;
  reviewCycleId: string;
  isActive: boolean;
}): Promise<GovernanceActionResult> {
  const reviewCycle = await input.tx.reviewCycle.findUnique({
    where: { id: input.reviewCycleId },
    select: {
      id: true,
      name: true,
      year: true,
      quarter: true,
      startDate: true,
      endDate: true,
      isActive: true,
    },
  });

  if (!reviewCycle) {
    return {
      ok: false,
      message: "Review cycle was not found.",
      fieldErrors: {
        reviewCycleId: ["Review cycle was not found."],
      },
    };
  }

  if (reviewCycle.isActive === input.isActive) {
    return {
      ok: true,
      message: input.isActive
        ? "Review cycle is already active."
        : "Review cycle is already inactive.",
      id: reviewCycle.id,
    };
  }

  if (input.isActive) {
    await input.tx.reviewCycle.updateMany({
      where: {
        isActive: true,
        id: { not: reviewCycle.id },
      },
      data: { isActive: false },
    });
  }

  const updatedCycle = await input.tx.reviewCycle.update({
    where: { id: reviewCycle.id },
    data: { isActive: input.isActive },
    select: { id: true, name: true, isActive: true },
  });

  await input.tx.auditLog.create({
    data: {
      actorId: input.actorId,
      entityType: "ReviewCycle",
      entityId: updatedCycle.id,
      action: input.isActive
        ? "REVIEW_CYCLE_ACTIVATED"
        : "REVIEW_CYCLE_DEACTIVATED",
      metadata: {
        reviewCycleId: updatedCycle.id,
        name: updatedCycle.name,
        year: reviewCycle.year,
        quarter: reviewCycle.quarter,
        startDate: reviewCycle.startDate.toISOString(),
        endDate: reviewCycle.endDate.toISOString(),
        deactivatedOtherActiveCycles: input.isActive,
      } satisfies Prisma.JsonObject,
    },
  });

  return {
    ok: true,
    message: input.isActive
      ? "Review cycle activated."
      : "Review cycle deactivated.",
    id: updatedCycle.id,
  };
}

export async function toggleGoalLock(input: {
  tx: TransactionClient;
  actorId: string;
  goalId: string;
  locked: boolean;
  reason: string | null;
}): Promise<GovernanceActionResult> {
  const goal = await input.tx.goal.findUnique({
    where: { id: input.goalId },
    select: {
      id: true,
      title: true,
      status: true,
      lockedAt: true,
      ownerId: true,
      reviewCycleId: true,
      isArchived: true,
    },
  });

  if (!goal || goal.isArchived) {
    return {
      ok: false,
      message: "Goal was not found in governance scope.",
      fieldErrors: {
        goalId: ["Goal was not found in governance scope."],
      },
    };
  }

  const isLocked = goal.status === GoalStatus.LOCKED;

  if (isLocked === input.locked) {
    return {
      ok: true,
      message: input.locked ? "Goal is already locked." : "Goal is already unlocked.",
      id: goal.id,
    };
  }

  const previousStatus = goal.status;
  const nextStatus = input.locked ? GoalStatus.LOCKED : GoalStatus.APPROVED;

  if (!input.locked && previousStatus !== GoalStatus.LOCKED) {
    return {
      ok: false,
      message: "Only locked goals can be unlocked.",
    };
  }

  if (input.locked && previousStatus === GoalStatus.REJECTED) {
    return {
      ok: false,
      message: "Rejected goals must be resubmitted and approved before locking.",
    };
  }

  await input.tx.goal.update({
    where: { id: goal.id },
    data: {
      status: nextStatus,
      lockedAt: input.locked ? new Date() : null,
    },
    select: { id: true },
  });

  await input.tx.auditLog.create({
    data: {
      actorId: input.actorId,
      goalId: goal.id,
      entityType: "Goal",
      entityId: goal.id,
      action: input.locked ? "GOAL_LOCKED" : "GOAL_UNLOCKED",
      metadata: {
        goalId: goal.id,
        title: goal.title,
        ownerId: goal.ownerId,
        reviewCycleId: goal.reviewCycleId,
        previousStatus,
        nextStatus,
        reasonProvided: Boolean(input.reason),
        reason: input.reason,
      } satisfies Prisma.JsonObject,
    },
  });

  return {
    ok: true,
    message: input.locked
      ? "Goal locked for governance."
      : "Goal unlocked and returned to approved status.",
    id: goal.id,
  };
}
