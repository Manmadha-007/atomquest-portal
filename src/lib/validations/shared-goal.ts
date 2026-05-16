import { z } from "zod";

export const MIN_SHARED_GOAL_WEIGHTAGE = 10;
export const MAX_SHARED_GOAL_WEIGHTAGE = 100;
export const MAX_TOTAL_GOAL_WEIGHTAGE = 100;
export const MAX_SHARED_GOAL_RECIPIENTS = 50;

const uuidMessage = "A valid goal or employee selection is required.";

export const createSharedGoalSchema = z.object({
  parentGoalId: z.string().uuid(uuidMessage),
  employeeIds: z
    .array(z.string().uuid(uuidMessage))
    .min(1, "Select at least one employee.")
    .max(
      MAX_SHARED_GOAL_RECIPIENTS,
      `Select ${MAX_SHARED_GOAL_RECIPIENTS} employees or fewer at once.`,
    )
    .refine(
      (employeeIds) => new Set(employeeIds).size === employeeIds.length,
      "Remove duplicate employee selections.",
    ),
  weightage: z
    .number({ error: "Weightage is required." })
    .int("Weightage must be a whole number.")
    .min(
      MIN_SHARED_GOAL_WEIGHTAGE,
      `Shared goals must carry at least ${MIN_SHARED_GOAL_WEIGHTAGE}% weightage.`,
    )
    .max(
      MAX_SHARED_GOAL_WEIGHTAGE,
      `Weightage cannot exceed ${MAX_SHARED_GOAL_WEIGHTAGE}%.`,
    ),
});

export const updateSharedGoalWeightageSchema = z.object({
  goalId: z.string().uuid("A valid shared goal is required."),
  weightage: z
    .number({ error: "Weightage is required." })
    .int("Weightage must be a whole number.")
    .min(
      MIN_SHARED_GOAL_WEIGHTAGE,
      `Shared goals must carry at least ${MIN_SHARED_GOAL_WEIGHTAGE}% weightage.`,
    )
    .max(
      MAX_SHARED_GOAL_WEIGHTAGE,
      `Weightage cannot exceed ${MAX_SHARED_GOAL_WEIGHTAGE}%.`,
    ),
});

export type CreateSharedGoalInput = z.infer<typeof createSharedGoalSchema>;
export type UpdateSharedGoalWeightageInput = z.infer<
  typeof updateSharedGoalWeightageSchema
>;

export type CreateSharedGoalFieldErrors = Partial<
  Record<keyof CreateSharedGoalInput, string[]>
>;

export type UpdateSharedGoalWeightageFieldErrors = Partial<
  Record<keyof UpdateSharedGoalWeightageInput, string[]>
>;

export function toCreateSharedGoalFieldErrors(
  error: z.ZodError,
): CreateSharedGoalFieldErrors {
  return error.flatten().fieldErrors as CreateSharedGoalFieldErrors;
}

export function toUpdateSharedGoalWeightageFieldErrors(
  error: z.ZodError,
): UpdateSharedGoalWeightageFieldErrors {
  return error.flatten().fieldErrors as UpdateSharedGoalWeightageFieldErrors;
}

export function getRemainingGoalWeightage(currentWeightage: number) {
  return Math.max(0, MAX_TOTAL_GOAL_WEIGHTAGE - currentWeightage);
}

export function canAddGoalWeightage(
  currentWeightage: number,
  nextWeightage: number,
) {
  return currentWeightage + nextWeightage <= MAX_TOTAL_GOAL_WEIGHTAGE;
}
