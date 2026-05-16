import { QuarterlyStatus } from "@prisma/client";
import { z } from "zod";

const requiredText = (field: string, maxLength: number) =>
  z
    .string()
    .trim()
    .min(1, `${field} is required.`)
    .max(maxLength, `${field} must be ${maxLength} characters or fewer.`);

const dateText = (field: string) =>
  z
    .string()
    .trim()
    .min(1, `${field} is required.`)
    .refine(
      (value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)),
      `${field} must be a valid date.`,
    );

const optionalDateText = (field: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value) => value || "")
    .refine(
      (value) => !value || !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)),
      `${field} must be a valid date.`,
    );

function toUtcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export const reviewCycleStatusOptions = [
  QuarterlyStatus.NOT_STARTED,
  QuarterlyStatus.ON_TRACK,
  QuarterlyStatus.COMPLETED,
  QuarterlyStatus.DELAYED,
] as const;

export const reviewCycleSchema = z
  .object({
    name: requiredText("Cycle name", 120),
    year: z
      .number({ error: "Year is required." })
      .int("Year must be a whole number.")
      .min(2020, "Year must be 2020 or later.")
      .max(2100, "Year must be 2100 or earlier."),
    quarter: z
      .number({ error: "Quarter is required." })
      .int("Quarter must be a whole number.")
      .min(1, "Quarter must be between 1 and 4.")
      .max(4, "Quarter must be between 1 and 4."),
    status: z.enum(reviewCycleStatusOptions, {
      error: "Cycle status is required.",
    }),
    startDate: dateText("Start date"),
    endDate: dateText("End date"),
    submissionDeadline: optionalDateText("Submission deadline"),
    lockDate: optionalDateText("Lock date"),
    activate: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    const startDate = toUtcDate(value.startDate);
    const endDate = toUtcDate(value.endDate);
    const submissionDeadline = value.submissionDeadline
      ? toUtcDate(value.submissionDeadline)
      : null;
    const lockDate = value.lockDate ? toUtcDate(value.lockDate) : null;

    if (endDate < startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be after the start date.",
      });
    }

    if (
      submissionDeadline &&
      (submissionDeadline < startDate || submissionDeadline > endDate)
    ) {
      context.addIssue({
        code: "custom",
        path: ["submissionDeadline"],
        message: "Submission deadline must fall within the cycle window.",
      });
    }

    if (lockDate && (lockDate < startDate || lockDate > endDate)) {
      context.addIssue({
        code: "custom",
        path: ["lockDate"],
        message: "Lock date must fall within the cycle window.",
      });
    }
  });

export type ReviewCycleInput = z.infer<typeof reviewCycleSchema>;
export type ReviewCycleFieldErrors = Partial<
  Record<keyof ReviewCycleInput, string[]>
>;

export function toReviewCycleDate(value: string) {
  return toUtcDate(value);
}
