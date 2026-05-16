import { QuarterlyStatus } from "@prisma/client";
import { z } from "zod";

const requiredText = (field: string, maxLength: number) =>
  z
    .string()
    .trim()
    .min(1, `${field} is required.`)
    .max(maxLength, `${field} must be ${maxLength} characters or fewer.`);

const numericText = z
  .string()
  .trim()
  .min(1, "Current achievement value is required.")
  .refine(
    (value) => Number.isFinite(Number(value)),
    "Enter a valid achievement value.",
  )
  .refine((value) => Number(value) >= 0, "Achievement value cannot be negative.")
  .refine(
    (value) => Math.abs(Number(value)) < 10_000_000_000,
    "Achievement value is too large.",
  );

export const quarterlyStatusOptions = [
  QuarterlyStatus.NOT_STARTED,
  QuarterlyStatus.ON_TRACK,
  QuarterlyStatus.COMPLETED,
  QuarterlyStatus.DELAYED,
] as const;

export const quarterlyUpdateSchema = z.object({
  goalId: z.string().uuid("Select an approved goal."),
  achievementValue: numericText,
  quarterlyStatus: z.enum(quarterlyStatusOptions, {
    error: "Quarterly status is required.",
  }),
  accomplishmentSummary: requiredText("Accomplishment summary", 1000).min(
    20,
    "Summary should explain measurable progress.",
  ),
  blockerCommentary: requiredText("Blocker or risk commentary", 1000).min(
    5,
    "Add a blocker/risk note, or state that there are no blockers.",
  ),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes must be 1000 characters or fewer.")
    .optional(),
});

export type QuarterlyUpdateInput = z.infer<typeof quarterlyUpdateSchema>;
export type QuarterlyUpdateFieldErrors = Partial<
  Record<keyof QuarterlyUpdateInput, string[]>
>;
