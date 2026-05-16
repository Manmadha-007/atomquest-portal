"use server";

import { ApprovalDecision, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  decideGoalApproval,
  getApprovalRevalidationPaths,
  rejectionCommentSchema,
  toApprovalFieldErrors,
  type GoalApprovalActionResult,
  type RejectionCommentInput,
} from "@/lib/goals/approval-workflow";
import { prisma } from "@/lib/prisma";

export async function rejectGoal(
  input: RejectionCommentInput,
): Promise<GoalApprovalActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      message: "You must be signed in to reject goals.",
    };
  }

  const parsedInput = rejectionCommentSchema.safeParse(input);

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
          decision: ApprovalDecision.REJECTED,
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
    }

    return result;
  } catch (error) {
    console.error("Failed to reject goal", error);

    return {
      ok: false,
      message: "Goal could not be rejected. Please try again.",
    };
  }
}
