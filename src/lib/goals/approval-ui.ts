import { z } from "zod";

export type GoalApprovalActionResult = {
  ok: boolean;
  message: string;
  approvalId?: string;
  fieldErrors?: Partial<Record<"comments" | "goalId", string[]>>;
};

export type ApprovalDecisionKind = "APPROVED" | "REJECTED";

export const approvalCommentSchema = z.object({
  goalId: z.string().uuid("A valid goal is required."),
  comments: z
    .string()
    .trim()
    .max(1000, "Comments must be 1000 characters or fewer.")
    .optional()
    .transform((value) => value || null),
});

export const rejectionCommentSchema = approvalCommentSchema.extend({
  comments: z
    .string()
    .trim()
    .min(8, "Add a clear rejection comment for the employee.")
    .max(1000, "Comments must be 1000 characters or fewer."),
});

export type ApprovalCommentInput = z.input<typeof approvalCommentSchema>;
export type RejectionCommentInput = z.input<typeof rejectionCommentSchema>;

export function toApprovalFieldErrors(
  error: z.ZodError,
): GoalApprovalActionResult["fieldErrors"] {
  return error.flatten().fieldErrors as GoalApprovalActionResult["fieldErrors"];
}
