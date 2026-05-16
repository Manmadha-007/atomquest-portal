"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  assertAdminAction,
  getGovernanceRevalidationPaths,
  reviewCycleActivationSchema,
  setReviewCycleActivation,
  type GovernanceActionResult,
  type ReviewCycleActivationInput,
} from "@/lib/admin/governance";
import { prisma } from "@/lib/prisma";
import {
  reviewCycleSchema,
  toReviewCycleDate,
  type ReviewCycleFieldErrors,
  type ReviewCycleInput,
} from "@/lib/validations/review-cycle";

function toFieldErrors(error: unknown): ReviewCycleFieldErrors | undefined {
  const parsedError =
    error instanceof Error && "flatten" in error
      ? (error as { flatten: () => { fieldErrors: ReviewCycleFieldErrors } })
      : null;

  return parsedError?.flatten().fieldErrors;
}

function revalidateGovernancePaths() {
  for (const path of getGovernanceRevalidationPaths()) {
    revalidatePath(path);
  }
}

export async function createReviewCycle(
  input: ReviewCycleInput,
): Promise<GovernanceActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      message: "You must be signed in to create review cycles.",
    };
  }

  const adminError = assertAdminAction(session.user.role);

  if (adminError) {
    return adminError;
  }

  const parsedInput = reviewCycleSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: toFieldErrors(parsedInput.error),
    };
  }

  const values = parsedInput.data;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const reviewCycle = await tx.reviewCycle.create({
          data: {
            name: values.name,
            year: values.year,
            quarter: values.quarter,
            status: values.status,
            startDate: toReviewCycleDate(values.startDate),
            endDate: toReviewCycleDate(values.endDate),
            submissionDeadline: values.submissionDeadline
              ? toReviewCycleDate(values.submissionDeadline)
              : null,
            lockDate: values.lockDate ? toReviewCycleDate(values.lockDate) : null,
            isActive: false,
            createdById: session.user.id,
          },
          select: {
            id: true,
            name: true,
            year: true,
            quarter: true,
            status: true,
            startDate: true,
            endDate: true,
            submissionDeadline: true,
            lockDate: true,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: session.user.id,
            entityType: "ReviewCycle",
            entityId: reviewCycle.id,
            action: "REVIEW_CYCLE_CREATED",
            metadata: {
              reviewCycleId: reviewCycle.id,
              name: reviewCycle.name,
              year: reviewCycle.year,
              quarter: reviewCycle.quarter,
              status: reviewCycle.status,
              startDate: reviewCycle.startDate.toISOString(),
              endDate: reviewCycle.endDate.toISOString(),
              submissionDeadline:
                reviewCycle.submissionDeadline?.toISOString() ?? null,
              lockDate: reviewCycle.lockDate?.toISOString() ?? null,
            } satisfies Prisma.JsonObject,
          },
        });

        if (values.activate) {
          const activationResult = await setReviewCycleActivation({
            tx,
            actorId: session.user.id,
            reviewCycleId: reviewCycle.id,
            isActive: true,
          });

          if (!activationResult.ok) {
            return activationResult;
          }
        }

        return {
          ok: true,
          message: values.activate
            ? "Review cycle created and activated."
            : "Review cycle created.",
          id: reviewCycle.id,
        } satisfies GovernanceActionResult;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (result.ok) {
      revalidateGovernancePaths();
    }

    return result;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        message: "A review cycle already exists for this year and quarter.",
        fieldErrors: {
          quarter: ["This year and quarter already exists."],
          year: ["This year and quarter already exists."],
        },
      };
    }

    console.error("Failed to create review cycle", error);

    return {
      ok: false,
      message: "Review cycle could not be created. Please try again.",
    };
  }
}

export async function updateReviewCycleActivation(
  input: ReviewCycleActivationInput,
): Promise<GovernanceActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      message: "You must be signed in to update review cycle activation.",
    };
  }

  const adminError = assertAdminAction(session.user.role);

  if (adminError) {
    return adminError;
  }

  const parsedInput = reviewCycleActivationSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      message: "A valid review cycle is required.",
      fieldErrors: parsedInput.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await prisma.$transaction(
      (tx) =>
        setReviewCycleActivation({
          tx,
          actorId: session.user.id,
          reviewCycleId: parsedInput.data.reviewCycleId,
          isActive: parsedInput.data.isActive,
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
    console.error("Failed to update review cycle activation", error);

    return {
      ok: false,
      message: "Review cycle activation could not be updated.",
    };
  }
}
