import { GoalMeasurementType } from "@prisma/client";
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
  .optional()
  .refine(
    (value) => !value || Number.isFinite(Number(value)),
    "Enter a valid number.",
  )
  .refine((value) => !value || Number(value) >= 0, "Value cannot be negative.");

const parseNumber = (value?: string) => {
  if (!value) {
    return null;
  }

  return Number(value);
};

export const goalMeasurementTypeOptions = [
  GoalMeasurementType.MIN,
  GoalMeasurementType.MAX,
  GoalMeasurementType.TIMELINE,
  GoalMeasurementType.ZERO,
] as const;

export const goalPriorityOptions = [
  { value: 1, label: "Critical", description: "Executive attention required" },
  { value: 2, label: "High", description: "Important cycle commitment" },
  { value: 3, label: "Medium", description: "Standard quarterly priority" },
  { value: 4, label: "Low", description: "Useful but lower urgency" },
] as const;

export const createGoalSchema = z
  .object({
    title: requiredText("Title", 140).min(
      5,
      "Title must be at least 5 characters.",
    ),
    thrustArea: requiredText("Thrust area", 80),
    description: requiredText("Description", 1000).min(
      20,
      "Description should explain the business outcome.",
    ),
    measurementType: z.enum(goalMeasurementTypeOptions, {
      error: "Measurement type is required.",
    }),
    startValue: numericText,
    targetValue: numericText,
    weightage: z
      .number({ error: "Weightage is required." })
      .int("Weightage must be a whole number.")
      .min(10, "Each goal must carry at least 10% weightage.")
      .max(100, "Weightage cannot exceed 100%."),
    priority: z
      .number({ error: "Priority is required." })
      .int("Priority must be a whole number.")
      .min(1, "Priority must be between 1 and 4.")
      .max(4, "Priority must be between 1 and 4."),
    dueDate: z
      .string()
      .trim()
      .min(1, "Due date is required.")
      .refine(
        (value) => !Number.isNaN(Date.parse(value)),
        "Select a valid due date.",
       ),
  })
  .superRefine((value, context) => {
    const startValue = parseNumber(value.startValue);
    const targetValue = parseNumber(value.targetValue);

    if (
      value.measurementType === GoalMeasurementType.MIN ||
      value.measurementType === GoalMeasurementType.MAX ||
      value.measurementType === GoalMeasurementType.ZERO
    ) {
      if (startValue === null) {
        context.addIssue({
          code: "custom",
          path: ["startValue"],
          message: "Start value is required for numeric goals.",
        });
      }
    }

    if (
      value.measurementType === GoalMeasurementType.MIN ||
      value.measurementType === GoalMeasurementType.MAX
    ) {
      if (targetValue === null) {
        context.addIssue({
          code: "custom",
          path: ["targetValue"],
          message: "Target value is required for this measurement type.",
        });
      }
    }

    if (
      value.measurementType === GoalMeasurementType.MAX &&
      startValue !== null &&
      targetValue !== null &&
      targetValue <= startValue
    ) {
      context.addIssue({
        code: "custom",
        path: ["targetValue"],
        message: "MAX goals should target a value greater than the start value.",
      });
    }

    if (
      value.measurementType === GoalMeasurementType.MIN &&
      startValue !== null &&
      targetValue !== null &&
      targetValue >= startValue
    ) {
      context.addIssue({
        code: "custom",
        path: ["targetValue"],
        message: "MIN goals should target a value lower than the start value.",
      });
    }

    if (value.measurementType === GoalMeasurementType.ZERO) {
      if (targetValue !== null && targetValue !== 0) {
        context.addIssue({
          code: "custom",
          path: ["targetValue"],
          message: "ZERO goals must target 0.",
        });
      }
    }
  });

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type CreateGoalFieldErrors = Partial<
  Record<keyof CreateGoalInput, string[]>
>;
