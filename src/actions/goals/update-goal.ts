"use server";

import { GoalMeasurementType, GoalStatus, Prisma, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  updateGoalSchema,
  type UpdateGoalFieldErrors,
  type UpdateGoalInput,
} from "@/lib/validations/goal";

export type UpdateGoalResult = {
  ok: boolean;
  message: string;
  goalId?: string;
  fieldErrors?: UpdateGoalFieldErrors;
};

const MAX_TOTAL_WEIGHTAGE = 100;

function toDecimal(value?: string) {
  if (!value) {
    return null;
  }

  return new Prisma.Decimal(value);
}

function toDueDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toUtcDateOnly(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function toFieldErrors(error: unknown): UpdateGoalFieldErrors | undefined {
  const parsedError =
    error instanceof Error && "flatten" in error
      ? (error as { flatten: () => { fieldErrors: UpdateGoalFieldErrors } })
      : null;

  return parsedError?.flatten().fieldErrors;
}

export async function updateGoal(
  input: UpdateGoalInput,
): Promise<UpdateGoalResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      message: "You must be signed in to edit goals.",
    };
  }

  if (session.user.role !== UserRole.EMPLOYEE) {
    return {
      ok: false,
      message: "Only employee users can edit goals.",
    };
  }

  const parsedInput = updateGoalSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsedInput.error),
    };
  }

  const values = parsedInput.data;
  const dueDate = toDueDate(values.dueDate);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const goal = await tx.goal.findUnique({
          where: { id: values.goalId },
          select: {
            id: true,
            title: true,
            description: true,
            thrustArea: true,
            measurementType: true,
            startValue: true,
            targetValue: true,
            weight: true,
            priority: true,
            timelineTarget: true,
            ownerId: true,
            reviewCycleId: true,
            status: true,
            isArchived: true,
            reviewCycle: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
                isActive: true,
              },
            },
          },
        });

        if (!goal || goal.isArchived) {
          return {
            ok: false,
            message: "Goal was not found.",
            fieldErrors: {
              goalId: ["Goal was not found."],
            },
          } satisfies UpdateGoalResult;
        }

        if (goal.ownerId !== session.user.id) {
          return {
            ok: false,
            message: "You can only edit goals you own.",
          } satisfies UpdateGoalResult;
        }

        if (
          goal.status !== GoalStatus.DRAFT &&
          goal.status !== GoalStatus.REJECTED
        ) {
          return {
            ok: false,
            message: "Only draft or rejected goals can be edited.",
          } satisfies UpdateGoalResult;
        }

        if (!goal.reviewCycle.isActive) {
          return {
            ok: false,
            message: "This goal belongs to an inactive review cycle.",
          } satisfies UpdateGoalResult;
        }

        // Validate due date within cycle bounds
        const cycleStartDate = toUtcDateOnly(goal.reviewCycle.startDate);
        const cycleEndDate = toUtcDateOnly(goal.reviewCycle.endDate);

        if (dueDate < cycleStartDate || dueDate > cycleEndDate) {
          return {
            ok: false,
            message: `Due date must fall inside ${goal.reviewCycle.name}.`,
            fieldErrors: {
              dueDate: ["Due date must be within the active review cycle."],
            },
          } satisfies UpdateGoalResult;
        }

        // Validate weightage — exclude this goal's current weight from the total
        const weightAggregate = await tx.goal.aggregate({
          where: {
            ownerId: session.user.id,
            reviewCycleId: goal.reviewCycleId,
            isArchived: false,
            id: { not: goal.id },
          },
          _sum: { weight: true },
        });

        const otherWeightage = Number(weightAggregate._sum.weight ?? 0);
        const nextTotal = otherWeightage + values.weightage;

        if (nextTotal > MAX_TOTAL_WEIGHTAGE) {
          const remaining = MAX_TOTAL_WEIGHTAGE - otherWeightage;
          return {
            ok: false,
            message: `Total goal weightage cannot exceed ${MAX_TOTAL_WEIGHTAGE}%. You can assign up to ${remaining}%.`,
            fieldErrors: {
              weightage: [
                `Only ${remaining}% weightage remains (excluding this goal).`,
              ],
            },
          } satisfies UpdateGoalResult;
        }

        const targetValue =
          values.measurementType === GoalMeasurementType.ZERO
            ? new Prisma.Decimal(0)
            : toDecimal(values.targetValue);

        // Capture previous values for audit
        const previousSnapshot = {
          title: goal.title,
          thrustArea: goal.thrustArea,
          measurementType: goal.measurementType,
          weightage: goal.weight,
          priority: goal.priority,
        };

        await tx.goal.update({
          where: { id: goal.id },
          data: {
            title: values.title,
            thrustArea: values.thrustArea,
            description: values.description,
            measurementType: values.measurementType,
            startValue: toDecimal(values.startValue),
            targetValue,
            currentValue: toDecimal(values.startValue),
            timelineTarget: dueDate,
            weight: values.weightage,
            priority: values.priority,
          },
          select: { id: true },
        });

        await tx.auditLog.create({
          data: {
            actorId: session.user.id,
            goalId: goal.id,
            entityType: "Goal",
            entityId: goal.id,
            action: "GOAL_UPDATED",
            metadata: {
              goalId: goal.id,
              previousStatus: goal.status,
              previous: previousSnapshot,
              updated: {
                title: values.title,
                thrustArea: values.thrustArea,
                measurementType: values.measurementType,
                weightage: values.weightage,
                priority: values.priority,
              },
            } satisfies Prisma.JsonObject,
          },
        });

        return {
          ok: true,
          message: "Goal updated successfully.",
          goalId: goal.id,
        } satisfies UpdateGoalResult;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (result.ok) {
      revalidatePath("/dashboard/employee");
      revalidatePath("/dashboard/manager/team-goals");
    }

    return result;
  } catch (error) {
    console.error("Failed to update goal", error);

    return {
      ok: false,
      message: "Goal could not be updated. Please try again.",
    };
  }
}
