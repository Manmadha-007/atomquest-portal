import { Prisma } from "@prisma/client";

import {
  calculateGoalProgress,
  type GoalMeasurementTypeValue,
} from "@/lib/goals/goal-progress";

type NullableNumeric =
  | number
  | string
  | {
      toString(): string;
    }
  | null
  | undefined;

type QuarterlyProgressInput =
  Readonly<{
    measurementType: GoalMeasurementTypeValue;
    startValue?: NullableNumeric;
    targetValue?: NullableNumeric;
    currentValue?: NullableNumeric;
    achievementValue?: NullableNumeric;
    dueDate?: Date | string | null;
    createdAt?: Date | string | null;
    now?: Date;
  }>;

type QuarterlyUpdateSummaryInput =
  Readonly<{
    accomplishmentSummary: string;
    blockerCommentary: string;
    notes?: string | null;
  }>;

const DECIMAL_SCALE = 4;

const COMMENTARY_PREFIX_PATTERN =
  /^(Accomplishments|Blockers\/Risks|Notes):\s*/i;

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, Math.round(value)),
  );
}

export function normalizeAchievementValue(
  value: NullableNumeric,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsedValue = Number(
    typeof value === "object" &&
      value !== null
      ? value.toString()
      : value,
  );

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  const normalizedValue =
    Math.round(
      parsedValue *
        10 ** DECIMAL_SCALE,
    ) /
    10 ** DECIMAL_SCALE;

  return Object.is(normalizedValue, -0)
    ? 0
    : normalizedValue;
}

export function toQuarterlyProgressDecimal(
  value: NullableNumeric,
) {
  const normalizedValue =
    normalizeAchievementValue(value);

  if (normalizedValue === null) {
    return null;
  }

  return new Prisma.Decimal(
    normalizedValue.toFixed(
      DECIMAL_SCALE,
    ),
  );
}

export function calculateQuarterlyProgress(
  input: QuarterlyProgressInput,
) {
  const achievementValue =
    normalizeAchievementValue(
      input.achievementValue,
    );

  if (
    input.measurementType ===
      "TIMELINE" &&
    achievementValue !== null
  ) {
    return clampPercentage(
      achievementValue,
    );
  }

  return calculateGoalProgress({
    measurementType:
      input.measurementType,

    startValue:
      normalizeAchievementValue(
        input.startValue,
      ),

    targetValue:
      normalizeAchievementValue(
        input.targetValue,
      ),

    currentValue:
      achievementValue ??
      normalizeAchievementValue(
        input.currentValue,
      ),

    dueDate: input.dueDate,
    createdAt: input.createdAt,
    now: input.now,
  });
}

export function formatAchievementValue(
  value: NullableNumeric,
  unit?: string | null,
) {
  const normalizedValue =
    normalizeAchievementValue(value);

  if (normalizedValue === null) {
    return "Not captured";
  }

  const formattedValue =
    new Intl.NumberFormat("en", {
      maximumFractionDigits:
        DECIMAL_SCALE,
    }).format(normalizedValue);

  return unit
    ? `${formattedValue} ${unit}`
    : formattedValue;
}

export function buildQuarterlyUpdateSummary({
  accomplishmentSummary,
  blockerCommentary,
  notes,
}: QuarterlyUpdateSummaryInput) {
  const sections = [
    `Accomplishments: ${accomplishmentSummary.trim()}`,

    `Blockers/Risks: ${blockerCommentary.trim()}`,
  ];

  const normalizedNotes =
    notes?.trim();

  if (normalizedNotes) {
    sections.push(
      `Notes: ${normalizedNotes}`,
    );
  }

  return sections.join("\n\n");
}

export function getLatestCommentary(
  summary: string,
) {
  return (
    summary
      .split(/\r?\n/)
      .map((line) =>
        line
          .replace(
            COMMENTARY_PREFIX_PATTERN,
            "",
          )
          .trim(),
      )
      .find(Boolean) ??
    "No commentary provided"
  );
}