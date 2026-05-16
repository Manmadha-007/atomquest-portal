"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  assertAdminAction,
  getGovernanceRevalidationPaths,
  goalLockSchema,
  toggleGoalLock as toggleGoalLockWorkflow,
  type GoalLockInput,
  type GovernanceActionResult,
} from "@/lib/admin/governance";
import { prisma } from "@/lib/prisma";

function revalidateGovernancePaths() {
  for (const path of getGovernanceRevalidationPaths()) {
    revalidatePath(path);
  }
}

export async function toggleGoalLock(
  input: GoalLockInput,
): Promise<GovernanceActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      message: "You must be signed in to update goal locks.",
    };
  }

  const adminError = assertAdminAction(session.user.role);

  if (adminError) {
    return adminError;
  }

  const parsedInput = goalLockSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      message: "Please confirm the goal lock action.",
      fieldErrors: parsedInput.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await prisma.$transaction(
      (tx) =>
        toggleGoalLockWorkflow({
          tx,
          actorId: session.user.id,
          goalId: parsedInput.data.goalId,
          locked: parsedInput.data.locked,
          reason: parsedInput.data.reason,
        }),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (result.ok) {
      revalidateGovernancePaths();
    }

    return result;
  } catch (error) {
    console.error("Failed to update goal lock", error);

    return {
      ok: false,
      message: "Goal lock could not be updated. Please try again.",
    };
  }
}
