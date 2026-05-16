"use server";

import { GoalStatus, Prisma, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  buildPrimaryGoalWhere,
  buildSharedGoalGroupName,
  buildSharedGoalRecipientWhere,
  canManageSharedGoals,
  getActiveReviewCycle,
  getGoalWeightageByOwner,
  getSharedGoalRevalidationPaths,
} from "@/lib/goals/shared-goals";
import { prisma } from "@/lib/prisma";
import {
  canAddGoalWeightage,
  createSharedGoalSchema,
  getRemainingGoalWeightage,
  toCreateSharedGoalFieldErrors,
  toUpdateSharedGoalWeightageFieldErrors,
  updateSharedGoalWeightageSchema,
  type CreateSharedGoalFieldErrors,
  type CreateSharedGoalInput,
  type UpdateSharedGoalWeightageFieldErrors,
  type UpdateSharedGoalWeightageInput,
} from "@/lib/validations/shared-goal";

export type CreateSharedGoalResult = {
  ok: boolean;
  message: string;
  createdCount?: number;
  fieldErrors?: CreateSharedGoalFieldErrors;
};

export type UpdateSharedGoalWeightageResult = {
  ok: boolean;
  message: string;
  fieldErrors?: UpdateSharedGoalWeightageFieldErrors;
};

const sharedGoalParentSelect = {
  id: true,
  reviewCycleId: true,
  ownerId: true,
  createdById: true,
  parentGoalId: true,
  sharedGoalGroupId: true,
  title: true,
  description: true,
  thrustArea: true,
  measurementType: true,
  unit: true,
  startValue: true,
  targetValue: true,
  timelineTarget: true,
  priority: true,
  status: true,
  isPrimaryOwner: true,
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
} as const satisfies Prisma.GoalSelect;

function getPersonName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`.trim();
}

function formatEmployeeList(employees: Array<{ firstName: string; lastName: string }>) {
  const names = employees.map(getPersonName);
  const visibleNames = names.slice(0, 3).join(", ");
  const remainingCount = names.length - 3;

  return remainingCount > 0
    ? `${visibleNames}, and ${remainingCount} more`
    : visibleNames;
}

function isKnownDuplicateError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function createSharedGoal(
  input: CreateSharedGoalInput,
): Promise<CreateSharedGoalResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      message: "You must be signed in to propagate shared goals.",
    };
  }

  if (!canManageSharedGoals(session.user.role)) {
    return {
      ok: false,
      message: "Only managers and admins can propagate shared goals.",
    };
  }

  const parsedInput = createSharedGoalSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: toCreateSharedGoalFieldErrors(parsedInput.error),
    };
  }

  const values = parsedInput.data;
  const employeeIds = [...new Set(values.employeeIds)];

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const activeReviewCycle = await getActiveReviewCycle(tx);

        if (!activeReviewCycle) {
          return {
            ok: false,
            message:
              "Shared goals can only be propagated during an active review cycle.",
          } satisfies CreateSharedGoalResult;
        }

        const parentGoal = await tx.goal.findFirst({
          where: {
            ...buildPrimaryGoalWhere({
              actorId: session.user.id,
              actorRole: session.user.role,
              reviewCycleId: activeReviewCycle.id,
            }),
            id: values.parentGoalId,
          },
          select: sharedGoalParentSelect,
        });

        if (!parentGoal || parentGoal.isArchived) {
          return {
            ok: false,
            message:
              "Select an approved primary goal from the active review cycle.",
            fieldErrors: {
              parentGoalId: [
                "Select an approved primary goal from the active review cycle.",
              ],
            },
          } satisfies CreateSharedGoalResult;
        }

        if (!parentGoal.isPrimaryOwner || parentGoal.parentGoalId) {
          return {
            ok: false,
            message: "Only primary goals can be propagated.",
            fieldErrors: {
              parentGoalId: ["Only primary goals can be propagated."],
            },
          } satisfies CreateSharedGoalResult;
        }

        if (parentGoal.status !== GoalStatus.APPROVED) {
          return {
            ok: false,
            message: "Only approved goals can be propagated.",
            fieldErrors: {
              parentGoalId: ["Only approved goals can be propagated."],
            },
          } satisfies CreateSharedGoalResult;
        }

        if (employeeIds.includes(parentGoal.ownerId)) {
          return {
            ok: false,
            message: "The primary owner already owns this goal.",
            fieldErrors: {
              employeeIds: ["Remove the primary owner from recipients."],
            },
          } satisfies CreateSharedGoalResult;
        }

        const employees = await tx.user.findMany({
          where: buildSharedGoalRecipientWhere({
            actorId: session.user.id,
            actorRole: session.user.role,
            employeeIds,
          }),
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            managerId: true,
            isActive: true,
          },
        });

        if (employees.length !== employeeIds.length) {
          return {
            ok: false,
            message:
              session.user.role === UserRole.MANAGER
                ? "Managers can only assign shared goals to active direct reports."
                : "One or more selected employees are not eligible for shared goals.",
            fieldErrors: {
              employeeIds: [
                "Review the selected employees and remove ineligible recipients.",
              ],
            },
          } satisfies CreateSharedGoalResult;
        }

        const existingSharedGoals = await tx.goal.findMany({
          where: {
            parentGoalId: parentGoal.id,
            ownerId: { in: employeeIds },
            isArchived: false,
          },
          select: {
            owner: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        if (existingSharedGoals.length > 0) {
          return {
            ok: false,
            message: `Already assigned to ${formatEmployeeList(
              existingSharedGoals.map((goal) => goal.owner),
            )}.`,
            fieldErrors: {
              employeeIds: [
                "Remove employees who already have this shared goal.",
              ],
            },
          } satisfies CreateSharedGoalResult;
        }

        const weightageByOwner = await getGoalWeightageByOwner({
          client: tx,
          reviewCycleId: activeReviewCycle.id,
          ownerIds: employeeIds,
        });
        const overCapacityEmployees = employees.filter((employee) => {
          const currentWeightage = weightageByOwner.get(employee.id) ?? 0;

          return !canAddGoalWeightage(currentWeightage, values.weightage);
        });

        if (overCapacityEmployees.length > 0) {
          const firstEmployee = overCapacityEmployees[0];
          const currentWeightage = firstEmployee
            ? weightageByOwner.get(firstEmployee.id) ?? 0
            : 0;

          return {
            ok: false,
            message: `${formatEmployeeList(
              overCapacityEmployees,
            )} would exceed 100% total goal weightage.`,
            fieldErrors: {
              weightage: [
                `${getPersonName(firstEmployee ?? overCapacityEmployees[0])} has ${getRemainingGoalWeightage(
                  currentWeightage,
                )}% remaining in this cycle.`,
              ],
            },
          } satisfies CreateSharedGoalResult;
        }

        const now = new Date();
        const memberIds = [parentGoal.ownerId, ...employeeIds];
        let sharedGoalGroupId = parentGoal.sharedGoalGroupId;

        if (!sharedGoalGroupId) {
          const sharedGoalGroup = await tx.sharedGoalGroup.create({
            data: {
              name: buildSharedGoalGroupName(parentGoal),
              description: `Propagation group for ${parentGoal.title}.`,
              createdById: session.user.id,
              reviewCycleId: activeReviewCycle.id,
              members: {
                connect: memberIds.map((id) => ({ id })),
              },
            },
            select: { id: true },
          });

          sharedGoalGroupId = sharedGoalGroup.id;

          await tx.goal.update({
            where: { id: parentGoal.id },
            data: {
              sharedGoalGroupId,
              isPrimaryOwner: true,
            },
            select: { id: true },
          });

          await tx.auditLog.create({
            data: {
              actorId: session.user.id,
              goalId: parentGoal.id,
              entityType: "SharedGoalGroup",
              entityId: sharedGoalGroupId,
              action: "SHARED_GOAL_GROUP_CREATED",
              metadata: {
                parentGoalId: parentGoal.id,
                parentGoalTitle: parentGoal.title,
                reviewCycleId: activeReviewCycle.id,
                memberCount: memberIds.length,
              } satisfies Prisma.JsonObject,
            },
          });
        } else {
          const existingMembers = await tx.sharedGoalGroup.findUnique({
            where: { id: sharedGoalGroupId },
            select: {
              members: {
                select: { id: true },
              },
            },
          });
          const existingMemberIds = new Set(
            existingMembers?.members.map((member) => member.id) ?? [],
          );
          const nextMemberIds = memberIds.filter(
            (memberId) => !existingMemberIds.has(memberId),
          );

          if (nextMemberIds.length > 0) {
            await tx.sharedGoalGroup.update({
              where: { id: sharedGoalGroupId },
              data: {
                members: {
                  connect: nextMemberIds.map((id) => ({ id })),
                },
              },
              select: { id: true },
            });
          }
        }

        const createdGoals = [];

        for (const employee of employees) {
          const sharedGoal = await tx.goal.create({
            data: {
              reviewCycleId: activeReviewCycle.id,
              ownerId: employee.id,
              createdById: session.user.id,
              parentGoalId: parentGoal.id,
              sharedGoalGroupId,
              title: parentGoal.title,
              description: parentGoal.description,
              thrustArea: parentGoal.thrustArea,
              measurementType: parentGoal.measurementType,
              unit: parentGoal.unit,
              startValue: parentGoal.startValue,
              targetValue: parentGoal.targetValue,
              currentValue: null,
              timelineTarget: parentGoal.timelineTarget,
              weight: values.weightage,
              priority: parentGoal.priority,
              isPrimaryOwner: false,
              isArchived: false,
              status: GoalStatus.APPROVED,
              version: 1,
              submittedAt: now,
              approvedAt: now,
            },
            select: {
              id: true,
              ownerId: true,
              owner: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          });

          createdGoals.push(sharedGoal);

          await tx.auditLog.create({
            data: {
              actorId: session.user.id,
              goalId: sharedGoal.id,
              entityType: "Goal",
              entityId: sharedGoal.id,
              action: "SHARED_GOAL_PROPAGATED",
              metadata: {
                parentGoalId: parentGoal.id,
                parentGoalTitle: parentGoal.title,
                sharedGoalGroupId,
                reviewCycleId: activeReviewCycle.id,
                recipientId: sharedGoal.ownerId,
                recipientName: getPersonName(sharedGoal.owner),
                weightage: values.weightage,
                progressSource: "parent_goal",
                immutableFields: [
                  "title",
                  "description",
                  "targets",
                  "progress",
                  "achievementValues",
                ],
              } satisfies Prisma.JsonObject,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorId: session.user.id,
            goalId: parentGoal.id,
            entityType: "Goal",
            entityId: parentGoal.id,
            action: "SHARED_GOAL_PARENT_PROPAGATED",
            metadata: {
              parentGoalId: parentGoal.id,
              sharedGoalGroupId,
              reviewCycleId: activeReviewCycle.id,
              createdSharedGoalIds: createdGoals.map((goal) => goal.id),
              recipientCount: createdGoals.length,
            } satisfies Prisma.JsonObject,
          },
        });

        return {
          ok: true,
          message: `Shared goal propagated to ${createdGoals.length} employee${
            createdGoals.length === 1 ? "" : "s"
          }.`,
          createdCount: createdGoals.length,
        } satisfies CreateSharedGoalResult;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (result.ok) {
      for (const path of getSharedGoalRevalidationPaths()) {
        revalidatePath(path);
      }
    }

    return result;
  } catch (error) {
    if (isKnownDuplicateError(error)) {
      return {
        ok: false,
        message: "One or more selected employees already have this shared goal.",
        fieldErrors: {
          employeeIds: ["Remove duplicate shared-goal recipients."],
        },
      };
    }

    console.error("Failed to create shared goal", error);

    return {
      ok: false,
      message: "Shared goal could not be propagated. Please try again.",
    };
  }
}

export async function updateSharedGoalWeightage(
  input: UpdateSharedGoalWeightageInput,
): Promise<UpdateSharedGoalWeightageResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      message: "You must be signed in to update shared goal weightage.",
    };
  }

  const parsedInput = updateSharedGoalWeightageSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: toUpdateSharedGoalWeightageFieldErrors(parsedInput.error),
    };
  }

  const values = parsedInput.data;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const activeReviewCycle = await getActiveReviewCycle(tx);

        if (!activeReviewCycle) {
          return {
            ok: false,
            message:
              "Shared goal weightage can only be changed during an active review cycle.",
          } satisfies UpdateSharedGoalWeightageResult;
        }

        const goal = await tx.goal.findUnique({
          where: { id: values.goalId },
          select: {
            id: true,
            title: true,
            ownerId: true,
            parentGoalId: true,
            reviewCycleId: true,
            status: true,
            isArchived: true,
            weight: true,
          },
        });

        if (!goal || goal.isArchived || !goal.parentGoalId) {
          return {
            ok: false,
            message: "Select an active shared goal.",
            fieldErrors: {
              goalId: ["Select an active shared goal."],
            },
          } satisfies UpdateSharedGoalWeightageResult;
        }

        if (
          session.user.role !== UserRole.EMPLOYEE ||
          goal.ownerId !== session.user.id
        ) {
          return {
            ok: false,
            message: "Only the linked employee can adjust shared goal weightage.",
          } satisfies UpdateSharedGoalWeightageResult;
        }

        if (goal.reviewCycleId !== activeReviewCycle.id) {
          return {
            ok: false,
            message:
              "Shared goal weightage can only be changed in the active review cycle.",
          } satisfies UpdateSharedGoalWeightageResult;
        }

        if (goal.status === GoalStatus.LOCKED) {
          return {
            ok: false,
            message: "Locked shared goals cannot be changed.",
          } satisfies UpdateSharedGoalWeightageResult;
        }

        const weightageByOwner = await getGoalWeightageByOwner({
          client: tx,
          reviewCycleId: activeReviewCycle.id,
          ownerIds: [goal.ownerId],
          excludingGoalId: goal.id,
        });
        const currentWeightage = weightageByOwner.get(goal.ownerId) ?? 0;

        if (!canAddGoalWeightage(currentWeightage, values.weightage)) {
          return {
            ok: false,
            message: "Total goal weightage cannot exceed 100%.",
            fieldErrors: {
              weightage: [
                `Only ${getRemainingGoalWeightage(
                  currentWeightage,
                )}% weightage remains in this cycle.`,
              ],
            },
          } satisfies UpdateSharedGoalWeightageResult;
        }

        await tx.goal.update({
          where: { id: goal.id },
          data: {
            weight: values.weightage,
          },
          select: { id: true },
        });

        await tx.auditLog.create({
          data: {
            actorId: session.user.id,
            goalId: goal.id,
            entityType: "Goal",
            entityId: goal.id,
            action: "SHARED_GOAL_WEIGHTAGE_UPDATED",
            metadata: {
              parentGoalId: goal.parentGoalId,
              previousWeightage: goal.weight,
              nextWeightage: values.weightage,
              mutableFields: ["weightage"],
            } satisfies Prisma.JsonObject,
          },
        });

        return {
          ok: true,
          message: "Shared goal weightage updated.",
        } satisfies UpdateSharedGoalWeightageResult;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (result.ok) {
      for (const path of getSharedGoalRevalidationPaths()) {
        revalidatePath(path);
      }
    }

    return result;
  } catch (error) {
    console.error("Failed to update shared goal weightage", error);

    return {
      ok: false,
      message: "Shared goal weightage could not be updated. Please try again.",
    };
  }
}
