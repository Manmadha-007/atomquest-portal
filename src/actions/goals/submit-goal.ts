"use server";

import {
  ApprovalDecision,
  GoalStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import {
  notify,
  NotificationEvent,
  type NotificationPayload,
} from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const submitGoalSchema = z.object({
  goalId: z.string().uuid("A valid goal is required."),
});

export type SubmitGoalInput = z.input<typeof submitGoalSchema>;

export type SubmitGoalResult = {
  ok: boolean;
  message: string;
  goalId?: string;
  fieldErrors?: Partial<Record<"goalId", string[]>>;
};

type SubmitGoalTransactionResult =
  | SubmitGoalResult
  | (SubmitGoalResult & {
      notificationPayload: NotificationPayload;
    });

function toFieldErrors(
  error: z.ZodError,
): SubmitGoalResult["fieldErrors"] {
  return error.flatten()
    .fieldErrors as SubmitGoalResult["fieldErrors"];
}

export async function submitGoal(
  input: SubmitGoalInput,
): Promise<SubmitGoalResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      message: "You must be signed in to submit goals.",
    };
  }

  if (session.user.role !== UserRole.EMPLOYEE) {
    return {
      ok: false,
      message: "Only employee users can submit goals.",
    };
  }

  const parsedInput = submitGoalSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      message: "Select a valid draft goal to submit.",
      fieldErrors: toFieldErrors(parsedInput.error),
    };
  }

  try {
    const result =
      await prisma.$transaction<SubmitGoalTransactionResult>(
        async (tx) => {
          const activeReviewCycle =
            await tx.reviewCycle.findFirst({
              where: { isActive: true },
              orderBy: [
                { year: "desc" },
                { quarter: "desc" },
                { startDate: "desc" },
              ],
              select: {
                id: true,
                name: true,
                year: true,
                quarter: true,
              },
            });

          if (!activeReviewCycle) {
            return {
              ok: false,
              message:
                "Goals can only be submitted during an active review cycle.",
            };
          }

          const goal = await tx.goal.findUnique({
            where: { id: parsedInput.data.goalId },
            select: {
              id: true,
              title: true,
              ownerId: true,
              reviewCycleId: true,
              parentGoalId: true,
              sharedGoalGroupId: true,
              isPrimaryOwner: true,
              isArchived: true,
              status: true,
              version: true,
              owner: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  manager: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      role: true,
                      isActive: true,
                    },
                  },
                },
              },
            },
          });

          if (!goal || goal.isArchived) {
            return {
              ok: false,
              message:
                "Select a draft goal from the active review cycle.",
              fieldErrors: {
                goalId: [
                  "Select a draft goal from the active review cycle.",
                ],
              },
            };
          }

          if (goal.ownerId !== session.user.id) {
            return {
              ok: false,
              message: "You can only submit goals you own.",
              fieldErrors: {
                goalId: [
                  "You can only submit goals you own.",
                ],
              },
            };
          }

          if (goal.reviewCycleId !== activeReviewCycle.id) {
            return {
              ok: false,
              message:
                "This goal does not belong to the active review cycle.",
              fieldErrors: {
                goalId: [
                  "Select a goal from the active review cycle.",
                ],
              },
            };
          }

          if (
            goal.parentGoalId ||
            !goal.isPrimaryOwner
          ) {
            return {
              ok: false,
              message:
                "Shared goals are submitted through their primary goal.",
              fieldErrors: {
                goalId: [
                  "Shared goals cannot be submitted independently.",
                ],
              },
            };
          }

          if (goal.status === GoalStatus.LOCKED) {
            return {
              ok: false,
              message:
                "Locked goals cannot be submitted.",
              fieldErrors: {
                goalId: [
                  "Locked goals cannot be submitted.",
                ],
              },
            };
          }

          if (goal.status !== GoalStatus.DRAFT) {
            return {
              ok: false,
              message:
                "Only draft goals can be submitted.",
              fieldErrors: {
                goalId: [
                  "Only draft goals can be submitted.",
                ],
              },
            };
          }

          if (
            !goal.owner.manager ||
            goal.owner.manager.role !== UserRole.MANAGER ||
            !goal.owner.manager.isActive
          ) {
            return {
              ok: false,
              message:
                "A current manager assignment is required before submitting goals.",
              fieldErrors: {
                goalId: [
                  "Ask an administrator to assign an active manager before submission.",
                ],
              },
            };
          }

          const submittedAt = new Date();
          const managerId = goal.owner.manager.id;

          await tx.goal.update({
            where: { id: goal.id },
            data: {
              status: GoalStatus.SUBMITTED,
              submittedAt,
              approvedAt: null,
              rejectedAt: null,
              lockedAt: null,
            },
            select: { id: true },
          });

          const approval =
            await tx.goalApproval.upsert({
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
                decision: ApprovalDecision.PENDING,
                comments: null,
                decidedAt: null,
              },
              update: {
                decision: ApprovalDecision.PENDING,
                comments: null,
                decidedAt: null,
              },
              select: { id: true },
            });

          await tx.auditLog.create({
            data: {
              actorId: session.user.id,
              goalId: goal.id,
              entityType: "Goal",
              entityId: goal.id,
              action: "GOAL_SUBMITTED",
              metadata: {
                goalId: goal.id,
                goalTitle: goal.title,
                ownerId: goal.ownerId,
                ownerName:
                  `${goal.owner.firstName} ${goal.owner.lastName}`.trim(),
                managerId,
                approvalId: approval.id,
                reviewCycleId: activeReviewCycle.id,
                reviewCycle:
                  `${activeReviewCycle.name} - Q${activeReviewCycle.quarter} ${activeReviewCycle.year}`,
                version: goal.version,
                previousStatus: GoalStatus.DRAFT,
                nextStatus: GoalStatus.SUBMITTED,
                submittedAt:
                  submittedAt.toISOString(),
                sharedGoalGroupId:
                  goal.sharedGoalGroupId,
              } satisfies Prisma.JsonObject,
            },
          });

          return {
            ok: true,
            message:
              "Goal submitted for manager approval.",
            goalId: goal.id,

            notificationPayload: {
              event:
                NotificationEvent.GOAL_SUBMITTED,

              actor: {
                id: session.user.id,
                name:
                  `${goal.owner.firstName} ${goal.owner.lastName}`.trim(),
                email:
                  goal.owner.email || undefined,
              },

              recipient: {
                id: managerId,
                name:
                  `${goal.owner.manager.firstName} ${goal.owner.manager.lastName}`.trim(),
                email:
                  goal.owner.manager.email ||
                  undefined,
              },

              metadata: {
                goalId: goal.id,
                goalTitle: goal.title,
              },
            },
          };
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel
              .Serializable,
        },
      );

    if (result.ok) {
      revalidatePath("/dashboard/employee");
      revalidatePath(
        "/dashboard/manager/team-goals",
      );
      revalidatePath(
        "/dashboard/manager/approvals",
      );

      const payload =
        "notificationPayload" in result
          ? result.notificationPayload
          : null;

      if (payload) {
        if (!payload.recipient.email) {
          console.warn(
            "Skipping GOAL_SUBMITTED notification: manager email is missing.",
          );
        } else {
          try {
            await notify(payload);
          } catch (err) {
            console.error(
              "Failed to send GOAL_SUBMITTED notification:",
              err,
            );
          }
        }
      }
    }

    return result;
  } catch (error) {
    console.error(
      "Failed to submit goal",
      error,
    );

    return {
      ok: false,
      message:
        "Goal could not be submitted. Please try again.",
    };
  }
}