"use server";

import { ApprovalDecision, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  approvalCommentSchema,
  toApprovalFieldErrors,
  type ApprovalCommentInput,
  type GoalApprovalActionResult,
} from "@/lib/goals/approval-ui";
import {
  decideGoalApproval,
  getApprovalRevalidationPaths,
} from "@/lib/goals/approval-workflow";
import { prisma } from "@/lib/prisma";
import { notify, NotificationEvent } from "@/lib/notifications";

export async function approveGoal(
  input: ApprovalCommentInput,
): Promise<GoalApprovalActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      message: "You must be signed in to approve goals.",
    };
  }

  const parsedInput = approvalCommentSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: toApprovalFieldErrors(parsedInput.error),
    };
  }

  try {
    const result = await prisma.$transaction(
      (tx) =>
        decideGoalApproval({
          tx,
          managerId: session.user.id,
          managerRole: session.user.role,
          goalId: parsedInput.data.goalId,
          decision: ApprovalDecision.APPROVED,
          comments: parsedInput.data.comments,
        }),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (result.ok && result.ownerId) {
      for (const path of getApprovalRevalidationPaths(result.ownerId)) {
        revalidatePath(path);
      }

      // Send GOAL_APPROVED notification to the employee
      if (result.ownerEmail) {
        try {
          await notify({
            event: NotificationEvent.GOAL_APPROVED,
            actor: {
              id: session.user.id,
              name: session.user.name || undefined,
              email: session.user.email || undefined,
            },
            recipient: {
              id: result.ownerId,
              name: result.ownerName,
              email: result.ownerEmail,
            },
            metadata: {
              goalId: result.goalId,
              goalTitle: result.goalTitle,
            },
          });
        } catch (err) {
          console.error("Failed to send GOAL_APPROVED notification:", err);
        }
      } else {
        console.warn("Skipping GOAL_APPROVED notification: employee email is missing.");
      }
    }

    return result;
  } catch (error) {
    console.error("Failed to approve goal", error);

    return {
      ok: false,
      message: "Goal could not be approved. Please try again.",
    };
  }
}
