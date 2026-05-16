import { GoalMeasurementType, type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  formatEnumLabel,
  formatExportDate,
  formatExportDateTime,
  formatExportNumber,
  formatPersonName,
  getScopedGoalOwnerWhere,
  type ExportColumn,
  type ExportScope,
} from "@/lib/reports/export-utils";

export type QuarterlyUpdateExportRow = {
  employee: string;
  goalTitle: string;
  quarter: string;
  plannedTarget: string;
  actualAchievement: string;
  managerComments: string;
  completionStatus: string;
  updateTimestamp: string;
};

export const quarterlyUpdateExportColumns = [
  { key: "employee", header: "Employee", width: 24 },
  { key: "goalTitle", header: "Goal Title", width: 36 },
  { key: "quarter", header: "Quarter", width: 14 },
  { key: "plannedTarget", header: "Planned Target", width: 18 },
  { key: "actualAchievement", header: "Actual Achievement", width: 22 },
  { key: "managerComments", header: "Manager Comments", width: 38 },
  { key: "completionStatus", header: "Completion Status", width: 20 },
  { key: "updateTimestamp", header: "Update Timestamp", width: 26 },
] satisfies Array<ExportColumn<QuarterlyUpdateExportRow>>;

const quarterlyUpdateExportSelect = {
  id: true,
  quarter: true,
  progressValue: true,
  quarterlyStatus: true,
  updatedAt: true,
  goal: {
    select: {
      title: true,
      measurementType: true,
      targetValue: true,
      timelineTarget: true,
      unit: true,
      reviewCycle: {
        select: {
          year: true,
        },
      },
      owner: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      approvals: {
        where: {
          comments: {
            not: null,
          },
        },
        orderBy: [{ decidedAt: "desc" }, { updatedAt: "desc" }],
        take: 1,
        select: {
          comments: true,
        },
      },
    },
  },
} as const satisfies Prisma.GoalUpdateSelect;

type QuarterlyUpdateExportRecord = Prisma.GoalUpdateGetPayload<{
  select: typeof quarterlyUpdateExportSelect;
}>;

function formatPlannedTarget(
  goal: QuarterlyUpdateExportRecord["goal"],
) {
  if (goal.measurementType === GoalMeasurementType.TIMELINE) {
    return formatExportDate(goal.timelineTarget);
  }

  if (goal.measurementType === GoalMeasurementType.ZERO) {
    return "0";
  }

  return formatExportNumber(goal.targetValue);
}

function formatActualAchievement(update: QuarterlyUpdateExportRecord) {
  const value = formatExportNumber(update.progressValue);

  if (!value) {
    return "";
  }

  return update.goal.unit ? `${value} ${update.goal.unit}` : value;
}

function mapQuarterlyUpdateToExportRow(
  update: QuarterlyUpdateExportRecord,
): QuarterlyUpdateExportRow {
  return {
    employee: formatPersonName(update.goal.owner),
    goalTitle: update.goal.title,
    quarter: `Q${update.quarter} ${update.goal.reviewCycle.year}`,
    plannedTarget: formatPlannedTarget(update.goal),
    actualAchievement: formatActualAchievement(update),
    managerComments:
      update.goal.approvals[0]?.comments?.trim() || "No manager comments",
    completionStatus: formatEnumLabel(update.quarterlyStatus),
    updateTimestamp: formatExportDateTime(update.updatedAt),
  };
}

export async function getQuarterlyUpdateExportRows(
  scope: ExportScope,
): Promise<QuarterlyUpdateExportRow[]> {
  const updates = await prisma.goalUpdate.findMany({
    where: {
      goal: {
        isArchived: false,
        owner: getScopedGoalOwnerWhere(scope),
      },
    },
    orderBy: [
      { goal: { reviewCycle: { year: "desc" } } },
      { goal: { reviewCycle: { quarter: "desc" } } },
      { quarter: "desc" },
      { updatedAt: "desc" },
    ],
    select: quarterlyUpdateExportSelect,
  });

  return updates.map(mapQuarterlyUpdateToExportRow);
}
