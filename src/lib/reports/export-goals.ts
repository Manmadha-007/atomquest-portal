import { GoalMeasurementType, type Prisma } from "@prisma/client";

import { calculateQuarterlyProgress } from "@/lib/goals/quarterly-progress";
import { prisma } from "@/lib/prisma";
import {
  formatEnumLabel,
  formatExportDate,
  formatExportNumber,
  formatPersonName,
  formatReviewCycleLabel,
  getScopedGoalOwnerWhere,
  toExportNumber,
  type ExportColumn,
  type ExportScope,
} from "@/lib/reports/export-utils";

export type GoalExportRow = {
  employee: string;
  manager: string;
  goalTitle: string;
  thrustArea: string;
  measurementType: string;
  targetValue: string;
  currentAchievement: string;
  progressPercentage: number;
  status: string;
  dueDate: string;
  reviewCycle: string;
  sharedGoalStatus: string;
};

export const goalExportColumns = [
  { key: "employee", header: "Employee", width: 24 },
  { key: "manager", header: "Manager", width: 24 },
  { key: "goalTitle", header: "Goal Title", width: 36 },
  { key: "thrustArea", header: "Thrust Area", width: 24 },
  { key: "measurementType", header: "Measurement Type", width: 20 },
  { key: "targetValue", header: "Target Value", width: 18 },
  { key: "currentAchievement", header: "Current Achievement", width: 22 },
  { key: "progressPercentage", header: "Progress Percentage", width: 22 },
  { key: "status", header: "Status", width: 16 },
  { key: "dueDate", header: "Due Date", width: 16 },
  { key: "reviewCycle", header: "Review Cycle", width: 24 },
  { key: "sharedGoalStatus", header: "Shared-goal Status", width: 22 },
] satisfies Array<ExportColumn<GoalExportRow>>;

const goalExportSelect = {
  id: true,
  title: true,
  thrustArea: true,
  measurementType: true,
  startValue: true,
  targetValue: true,
  currentValue: true,
  timelineTarget: true,
  status: true,
  parentGoalId: true,
  sharedGoalGroupId: true,
  isPrimaryOwner: true,
  createdAt: true,
  owner: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
      manager: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  },
  reviewCycle: {
    select: {
      name: true,
      quarter: true,
      year: true,
    },
  },
  updates: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: {
      progressValue: true,
      quarterlyStatus: true,
      createdAt: true,
    },
  },
  parentGoal: {
    select: {
      id: true,
      measurementType: true,
      startValue: true,
      targetValue: true,
      currentValue: true,
      timelineTarget: true,
      createdAt: true,
      updates: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          progressValue: true,
          quarterlyStatus: true,
          createdAt: true,
        },
      },
    },
  },
} as const satisfies Prisma.GoalSelect;

type GoalExportRecord = Prisma.GoalGetPayload<{
  select: typeof goalExportSelect;
}>;

function formatGoalTarget(
  goal: Pick<
    GoalExportRecord,
    "measurementType" | "targetValue" | "timelineTarget"
  >,
) {
  if (goal.measurementType === GoalMeasurementType.TIMELINE) {
    return formatExportDate(goal.timelineTarget);
  }

  if (goal.measurementType === GoalMeasurementType.ZERO) {
    return "0";
  }

  return formatExportNumber(goal.targetValue);
}

function getSharedGoalStatus(goal: GoalExportRecord) {
  if (goal.parentGoalId || !goal.isPrimaryOwner) {
    return "Linked shared goal";
  }

  if (goal.sharedGoalGroupId) {
    return "Primary shared goal";
  }

  return "Individual goal";
}

function mapGoalToExportRow(goal: GoalExportRecord): GoalExportRow {
  const progressSource = goal.parentGoal ?? goal;
  const latestUpdate = progressSource.updates[0];
  const currentAchievement =
    latestUpdate?.progressValue ?? progressSource.currentValue;
  const progressPercentage = calculateQuarterlyProgress({
    measurementType: progressSource.measurementType,
    startValue: progressSource.startValue,
    targetValue: progressSource.targetValue,
    currentValue: progressSource.currentValue,
    achievementValue: currentAchievement,
    dueDate: progressSource.timelineTarget,
    createdAt: progressSource.createdAt,
  });

  return {
    employee: formatPersonName(goal.owner),
    manager: goal.owner.manager
      ? formatPersonName(goal.owner.manager)
      : "Unassigned",
    goalTitle: goal.title,
    thrustArea: goal.thrustArea,
    measurementType: formatEnumLabel(goal.measurementType),
    targetValue: formatGoalTarget(progressSource),
    currentAchievement: formatExportNumber(toExportNumber(currentAchievement)),
    progressPercentage,
    status: formatEnumLabel(goal.status),
    dueDate: formatExportDate(progressSource.timelineTarget),
    reviewCycle: formatReviewCycleLabel(goal.reviewCycle),
    sharedGoalStatus: getSharedGoalStatus(goal),
  };
}

export async function getGoalExportRows(
  scope: ExportScope,
): Promise<GoalExportRow[]> {
  const goals = await prisma.goal.findMany({
    where: {
      isArchived: false,
      owner: getScopedGoalOwnerWhere(scope),
    },
    orderBy: [
      { reviewCycle: { year: "desc" } },
      { reviewCycle: { quarter: "desc" } },
      { owner: { lastName: "asc" } },
      { owner: { firstName: "asc" } },
      { priority: "asc" },
      { createdAt: "asc" },
    ],
    select: goalExportSelect,
  });

  return goals.map(mapGoalToExportRow);
}
