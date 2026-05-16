import { GoalMeasurementType } from "@prisma/client";

type NullableNumeric = number | string | null | undefined;

type GoalProgressInput = {
  measurementType: GoalMeasurementType;
  startValue?: NullableNumeric;
  targetValue?: NullableNumeric;
  currentValue?: NullableNumeric;
  dueDate?: Date | string | null;
  createdAt?: Date | string | null;
  now?: Date;
};

const clampPercentage = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
};

const toNumber = (value: NullableNumeric) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const toDate = (value?: Date | string | null) => {
  if (!value) {
    return null;
  }

  const parsedValue = value instanceof Date ? value : new Date(value);
  return Number.isFinite(parsedValue.getTime()) ? parsedValue : null;
};

function calculateMaxProgress(input: GoalProgressInput) {
  const startValue = toNumber(input.startValue);
  const targetValue = toNumber(input.targetValue);
  const currentValue = toNumber(input.currentValue);

  if (startValue === null || targetValue === null || currentValue === null) {
    return 0;
  }

  const denominator = targetValue - startValue;

  if (denominator <= 0) {
    return currentValue >= targetValue ? 100 : 0;
  }

  return clampPercentage(((currentValue - startValue) / denominator) * 100);
}

function calculateMinProgress(input: GoalProgressInput) {
  const startValue = toNumber(input.startValue);
  const targetValue = toNumber(input.targetValue);
  const currentValue = toNumber(input.currentValue);

  if (startValue === null || targetValue === null || currentValue === null) {
    return 0;
  }

  const denominator = startValue - targetValue;

  if (denominator <= 0) {
    return currentValue <= targetValue ? 100 : 0;
  }

  return clampPercentage(((startValue - currentValue) / denominator) * 100);
}

function calculateZeroProgress(input: GoalProgressInput) {
  const startValue = toNumber(input.startValue);
  const currentValue = toNumber(input.currentValue);

  if (currentValue === null) {
    return 0;
  }

  if (currentValue <= 0) {
    return 100;
  }

  if (startValue === null || startValue <= 0) {
    return 0;
  }

  return clampPercentage((1 - currentValue / startValue) * 100);
}

function calculateTimelineProgress(input: GoalProgressInput) {
  const dueDate = toDate(input.dueDate);
  const createdAt = toDate(input.createdAt);
  const now = input.now ?? new Date();

  if (!dueDate || !createdAt) {
    return 0;
  }

  const totalDuration = dueDate.getTime() - createdAt.getTime();

  if (totalDuration <= 0) {
    return now >= dueDate ? 100 : 0;
  }

  return clampPercentage(
    ((now.getTime() - createdAt.getTime()) / totalDuration) * 100,
  );
}

export function calculateGoalProgress(input: GoalProgressInput) {
  switch (input.measurementType) {
    case GoalMeasurementType.MAX:
      return calculateMaxProgress(input);
    case GoalMeasurementType.MIN:
      return calculateMinProgress(input);
    case GoalMeasurementType.ZERO:
      return calculateZeroProgress(input);
    case GoalMeasurementType.TIMELINE:
      return calculateTimelineProgress(input);
    default:
      return 0;
  }
}
