"use server";

import { GoalStatus, Prisma, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  buildQuarterlyUpdateSummary,
  calculateQuarterlyProgress,
  normalizeAchievementValue,
  toQuarterlyProgressDecimal,
} from "@/lib/goals/quarterly-progress";
import { prisma } from "@/lib/prisma";
import {
  quarterlyUpdateSchema,
  type QuarterlyUpdateFieldErrors,
  type QuarterlyUpdateInput,
} from "@/lib/validations/quarterly-update";

export type CreateQuarterlyUpdateResult = {
  ok: boolean;
  message: string;
  updateId?: string;
  fieldErrors?: QuarterlyUpdateFieldErrors;
};

function toFieldErrors(error: unknown): QuarterlyUpdateFieldErrors | undefined {
  const parsedError =
    error instanceof Error && "flatten" in error
      ? (error as {
          flatten: () => { fieldErrors: QuarterlyUpdateFieldErrors };
        })
      : null;

  return parsedError?.flatten().fieldErrors;
}

export async function createQuarterlyUpdate(
  input: QuarterlyUpdateInput,
): Promise<CreateQuarterlyUpdateResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      message: "You must be signed in to submit quarterly updates.",
    };
  }

  if (session.user.role !== UserRole.EMPLOYEE) {
    return {
      ok: false,
      message: "Only employee users can submit quarterly updates.",
    };
  }

  const parsedInput = quarterlyUpdateSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsedInput.error),
    };
  }

  const values = parsedInput.data;
  const achievementValue = normalizeAchievementValue(values.achievementValue);

  if (achievementValue === null) {
    return {
      ok: false,
      message: "Enter a valid current achievement value.",
      fieldErrors: {
        achievementValue: ["Enter a valid current achievement value."],
      },
    };
  }

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
            quarter: true,
            year: true,
          },
        });

        if (!activeReviewCycle) {
          return {
            ok: false,
            message:
              "Quarterly updates are only available during an active review cycle.",
          } satisfies CreateQuarterlyUpdateResult;
        }

        const goal = await tx.goal.findUnique({
          where: { id: values.goalId },
          select: {
            id: true,
            title: true,
            ownerId: true,
            parentGoalId: true,
            isPrimaryOwner: true,
            reviewCycleId: true,
            status: true,
            isArchived: true,
            measurementType: true,
            unit: true,
            startValue: true,
            targetValue: true,
            currentValue: true,
            timelineTarget: true,
            createdAt: true,
          },
        });

        if (!goal || goal.isArchived) {
          return {
            ok: false,
            message: "Select an approved goal from the active review cycle.",
            fieldErrors: {
              goalId: ["Select an approved goal from the active review cycle."],
            },
          } satisfies CreateQuarterlyUpdateResult;
        }

        if (goal.ownerId !== session.user.id) {
          return {
            ok: false,
            message: "You can only update goals you own.",
            fieldErrors: {
              goalId: ["You can only update goals you own."],
            },
          } satisfies CreateQuarterlyUpdateResult;
        }

        if (goal.parentGoalId || !goal.isPrimaryOwner) {
          return {
            ok: false,
            message:
              "Shared goals sync progress from the primary owner. You can only adjust their weightage.",
            fieldErrors: {
              goalId: [
                "Select a primary owned goal; shared goals cannot receive achievement updates.",
              ],
            },
          } satisfies CreateQuarterlyUpdateResult;
        }

        if (goal.reviewCycleId !== activeReviewCycle.id) {
          return {
            ok: false,
            message: "This goal does not belong to the active review cycle.",
            fieldErrors: {
              goalId: ["Select a goal from the active review cycle."],
            },
          } satisfies CreateQuarterlyUpdateResult;
        }

        if (goal.status === GoalStatus.LOCKED) {
          return {
            ok: false,
            message: "Locked goals cannot receive quarterly updates.",
            fieldErrors: {
              goalId: ["Locked goals cannot receive quarterly updates."],
            },
          } satisfies CreateQuarterlyUpdateResult;
        }

        if (goal.status !== GoalStatus.APPROVED) {
          return {
            ok: false,
            message: "Only approved goals can receive quarterly updates.",
            fieldErrors: {
              goalId: ["Only approved goals can receive quarterly updates."],
            },
          } satisfies CreateQuarterlyUpdateResult;
        }

        const existingUpdate = await tx.goalUpdate.findUnique({
          where: {
            goalId_quarter: {
              goalId: goal.id,
              quarter: activeReviewCycle.quarter,
            },
          },
          select: { id: true },
        });

        if (existingUpdate) {
          return {
            ok: false,
            message:
              "A quarterly update has already been submitted for this goal.",
            fieldErrors: {
              goalId: ["This goal already has an update for the active quarter."],
            },
          } satisfies CreateQuarterlyUpdateResult;
        }

        const summary = buildQuarterlyUpdateSummary({
          accomplishmentSummary: values.accomplishmentSummary,
          blockerCommentary: values.blockerCommentary,
          notes: values.notes,
        });
        const progressValue = toQuarterlyProgressDecimal(values.achievementValue);
        const progressPercentage = calculateQuarterlyProgress({
          measurementType: goal.measurementType,
          startValue: goal.startValue,
          targetValue: goal.targetValue,
          currentValue: goal.currentValue,
          achievementValue,
          dueDate: goal.timelineTarget,
          createdAt: goal.createdAt,
        });

        const update = await tx.goalUpdate.create({
          data: {
            goalId: goal.id,
            quarter: activeReviewCycle.quarter,
            createdById: session.user.id,
            summary,
            progressValue,
            quarterlyStatus: values.quarterlyStatus,
          },
          select: { id: true },
        });

        await tx.auditLog.create({
          data: {
            actorId: session.user.id,
            goalId: goal.id,
            entityType: "GoalUpdate",
            entityId: update.id,
            action: "GOAL_QUARTERLY_UPDATE_CREATED",
            metadata: {
              goalId: goal.id,
              goalTitle: goal.title,
              reviewCycleId: activeReviewCycle.id,
              reviewCycle: `${activeReviewCycle.name} - Q${activeReviewCycle.quarter} ${activeReviewCycle.year}`,
              quarter: activeReviewCycle.quarter,
              quarterlyStatus: values.quarterlyStatus,
              achievementValue: achievementValue.toString(),
              progressPercentage,
              unit: goal.unit,
              notesProvided: Boolean(values.notes?.trim()),
            } satisfies Prisma.JsonObject,
          },
        });

        return {
          ok: true,
          message: "Quarterly update submitted.",
          updateId: update.id,
        } satisfies CreateQuarterlyUpdateResult;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (result.ok) {
      revalidatePath("/dashboard/employee");
      revalidatePath("/dashboard/employee/quarterly-updates");
      revalidatePath("/dashboard/manager");
      revalidatePath("/dashboard/manager/team-progress");
      revalidatePath("/dashboard/manager/shared-goals");
      revalidatePath("/dashboard/admin/shared-goals");
    }

    return result;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        message: "A quarterly update has already been submitted for this goal.",
        fieldErrors: {
          goalId: ["This goal already has an update for the active quarter."],
        },
      };
    }

    console.error("Failed to create quarterly update", error);

    return {
      ok: false,
      message: "Quarterly update could not be submitted. Please try again.",
    };
  }
}
