"use server";

import { GoalMeasurementType, GoalStatus, Prisma, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  createGoalSchema,
  type CreateGoalFieldErrors,
  type CreateGoalInput,
} from "@/lib/validations/goal";

export type CreateGoalResult = {
  ok: boolean;
  message: string;
  goalId?: string;
  fieldErrors?: CreateGoalFieldErrors;
};

const MAX_GOALS_PER_CYCLE = 8;
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

function toFieldErrors(error: unknown): CreateGoalFieldErrors | undefined {
  const parsedError =
    error instanceof Error && "flatten" in error
      ? (error as { flatten: () => { fieldErrors: CreateGoalFieldErrors } })
      : null;

  return parsedError?.flatten().fieldErrors;
}

export async function createGoal(
  input: CreateGoalInput,
): Promise<CreateGoalResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      message: "You must be signed in to create goals.",
    };
  }

  if (session.user.role !== UserRole.EMPLOYEE) {
    return {
      ok: false,
      message: "Only employee users can create goals.",
    };
  }

  const parsedInput = createGoalSchema.safeParse(input);

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
        const activeReviewCycle = await tx.reviewCycle.findFirst({
          where: { isActive: true },
          orderBy: [
            { year: "desc" },
            { quarter: "desc" },
            { startDate: "desc" },
          ],
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        });

        if (!activeReviewCycle) {
          return {
            ok: false,
            message: "No active review cycle is available for goal creation.",
          } satisfies CreateGoalResult;
        }

        const cycleStartDate = toUtcDateOnly(activeReviewCycle.startDate);
        const cycleEndDate = toUtcDateOnly(activeReviewCycle.endDate);

        if (dueDate < cycleStartDate || dueDate > cycleEndDate) {
          return {
            ok: false,
            message: `Due date must fall inside ${activeReviewCycle.name}.`,
            fieldErrors: {
              dueDate: ["Due date must be within the active review cycle."],
            },
          } satisfies CreateGoalResult;
        }

        const [existingGoalCount, weightAggregate] = await Promise.all([
          tx.goal.count({
            where: {
              ownerId: session.user.id,
              reviewCycleId: activeReviewCycle.id,
              isArchived: false,
            },
          }),
          tx.goal.aggregate({
            where: {
              ownerId: session.user.id,
              reviewCycleId: activeReviewCycle.id,
              isArchived: false,
            },
            _sum: { weight: true },
          }),
        ]);

        if (existingGoalCount >= MAX_GOALS_PER_CYCLE) {
          return {
            ok: false,
            message: `Employees can create up to ${MAX_GOALS_PER_CYCLE} goals per review cycle.`,
          } satisfies CreateGoalResult;
        }

        const currentWeightage = Number(weightAggregate._sum.weight ?? 0);
        const nextWeightage = currentWeightage + values.weightage;

        if (nextWeightage > MAX_TOTAL_WEIGHTAGE) {
          return {
            ok: false,
            message: `Total goal weightage cannot exceed ${MAX_TOTAL_WEIGHTAGE}%. You have ${MAX_TOTAL_WEIGHTAGE - currentWeightage}% remaining.`,
            fieldErrors: {
              weightage: [
                `Only ${MAX_TOTAL_WEIGHTAGE - currentWeightage}% weightage remains in this cycle.`,
              ],
            },
          } satisfies CreateGoalResult;
        }

        const targetValue =
          values.measurementType === GoalMeasurementType.ZERO
            ? new Prisma.Decimal(0)
            : toDecimal(values.targetValue);

        const goal = await tx.goal.create({
          data: {
            reviewCycleId: activeReviewCycle.id,
            ownerId: session.user.id,
            createdById: session.user.id,
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
            isPrimaryOwner: true,
            isArchived: false,
            status: GoalStatus.DRAFT,
          },
          select: {
            id: true,
            title: true,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: session.user.id,
            goalId: goal.id,
            entityType: "Goal",
            entityId: goal.id,
            action: "GOAL_CREATED_DRAFT",
            metadata: {
              title: goal.title,
              reviewCycleId: activeReviewCycle.id,
              measurementType: values.measurementType,
              weightage: values.weightage,
              priority: values.priority,
              sharedGoalGroupId: null,
            },
          },
        });

        return {
          ok: true,
          message: "Goal saved as draft.",
          goalId: goal.id,
        } satisfies CreateGoalResult;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (result.ok) {
      revalidatePath("/dashboard/employee");
      revalidatePath("/dashboard/employee/quarterly-updates");
    }

    return result;
  } catch (error) {
    console.error("Failed to create goal", error);

    return {
      ok: false,
      message: "Goal could not be created. Please try again.",
    };
  }
}
