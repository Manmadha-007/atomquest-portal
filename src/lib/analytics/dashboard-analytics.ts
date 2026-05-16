import { GoalStatus, QuarterlyStatus, UserRole, type Prisma } from "@prisma/client";

import { calculateQuarterlyProgress } from "@/lib/goals/quarterly-progress";
import { prisma } from "@/lib/prisma";

export type AnalyticsScope = "admin" | "manager";

export type AnalyticsReviewCycle = {
  id: string;
  name: string;
  year: number;
  quarter: number;
  startDate: Date;
  endDate: Date;
  label: string;
};

export type StatusDistributionDatum = {
  status: GoalStatus;
  label: string;
  count: number;
  percentage: number;
  fill: string;
};

export type ProgressTrendDatum = {
  period: string;
  sortKey: string;
  averageProgress: number;
  completedCount: number;
  updateCount: number;
};

export type TeamPerformanceDatum = {
  name: string;
  goalCount: number;
  averageProgress: number;
  completionRate: number;
  overdueCount: number;
};

export type DashboardAnalytics = {
  scope: AnalyticsScope;
  reviewCycle: AnalyticsReviewCycle | null;
  totalGoals: number;
  approvedGoals: number;
  submittedGoals: number;
  reviewedGoals: number;
  approvalRate: number;
  completionPercentage: number;
  overduePercentage: number;
  overdueGoals: number;
  activeEmployeeCount: number;
  averageProgress: number;
  statusDistribution: StatusDistributionDatum[];
  progressTrend: ProgressTrendDatum[];
  teamPerformance: TeamPerformanceDatum[];
};

const analyticsGoalSelect = {
  id: true,
  parentGoalId: true,
  status: true,
  measurementType: true,
  startValue: true,
  targetValue: true,
  currentValue: true,
  timelineTarget: true,
  createdAt: true,
  owner: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: true,
      email: true,
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
      status: true,
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

const trendUpdateSelect = {
  id: true,
  quarter: true,
  progressValue: true,
  quarterlyStatus: true,
  goal: {
    select: {
      measurementType: true,
      startValue: true,
      targetValue: true,
      currentValue: true,
      timelineTarget: true,
      createdAt: true,
      reviewCycle: {
        select: {
          name: true,
          year: true,
          quarter: true,
        },
      },
    },
  },
} as const satisfies Prisma.GoalUpdateSelect;

type AnalyticsGoalRecord = Prisma.GoalGetPayload<{
  select: typeof analyticsGoalSelect;
}>;
type TrendUpdateRecord = Prisma.GoalUpdateGetPayload<{
  select: typeof trendUpdateSelect;
}>;

const goalStatuses = [
  GoalStatus.DRAFT,
  GoalStatus.SUBMITTED,
  GoalStatus.APPROVED,
  GoalStatus.REJECTED,
  GoalStatus.LOCKED,
] as const;

const statusLabels = {
  [GoalStatus.DRAFT]: "Draft",
  [GoalStatus.SUBMITTED]: "Submitted",
  [GoalStatus.APPROVED]: "Approved",
  [GoalStatus.REJECTED]: "Rejected",
  [GoalStatus.LOCKED]: "Locked",
} satisfies Record<GoalStatus, string>;

const statusColors = {
  [GoalStatus.DRAFT]: "#64748b",
  [GoalStatus.SUBMITTED]: "#2563eb",
  [GoalStatus.APPROVED]: "#059669",
  [GoalStatus.REJECTED]: "#e11d48",
  [GoalStatus.LOCKED]: "#d97706",
} satisfies Record<GoalStatus, string>;

function formatReviewCycleLabel(
  reviewCycle: Pick<AnalyticsReviewCycle, "name" | "quarter" | "year">,
) {
  return `${reviewCycle.name} - Q${reviewCycle.quarter} ${reviewCycle.year}`;
}

function toPercentage(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function getGoalProgress(goal: AnalyticsGoalRecord) {
  const progressSource = goal.parentGoal ?? goal;
  const latestUpdate = progressSource.updates[0];

  return calculateQuarterlyProgress({
    measurementType: progressSource.measurementType,
    startValue: progressSource.startValue,
    targetValue: progressSource.targetValue,
    currentValue: progressSource.currentValue,
    achievementValue: latestUpdate?.progressValue,
    dueDate: progressSource.timelineTarget,
    createdAt: progressSource.createdAt,
  });
}

function isGoalComplete(goal: AnalyticsGoalRecord, progress: number) {
  const progressSource = goal.parentGoal ?? goal;
  const latestUpdate = progressSource.updates[0];

  return (
    goal.status === GoalStatus.LOCKED ||
    latestUpdate?.quarterlyStatus === QuarterlyStatus.COMPLETED ||
    progress >= 100
  );
}

function isGoalOverdue(goal: AnalyticsGoalRecord, progress: number) {
  const progressSource = goal.parentGoal ?? goal;

  if (!progressSource.timelineTarget || progress >= 100) {
    return false;
  }

  if (goal.status === GoalStatus.REJECTED || goal.status === GoalStatus.LOCKED) {
    return false;
  }

  return progressSource.timelineTarget < new Date();
}

function getEmployeeName(goal: AnalyticsGoalRecord) {
  return (
    `${goal.owner.firstName} ${goal.owner.lastName}`.trim() || goal.owner.email
  );
}

function buildStatusDistribution(
  statusCounts: Array<{ status: GoalStatus; _count: { _all: number } }>,
  totalGoals: number,
) {
  const countByStatus = new Map(
    statusCounts.map((item) => [item.status, item._count._all]),
  );

  return goalStatuses.map((status) => {
    const count = countByStatus.get(status) ?? 0;

    return {
      status,
      label: statusLabels[status],
      count,
      percentage: toPercentage(count, totalGoals),
      fill: statusColors[status],
    };
  });
}

function buildTeamPerformance(
  goals: AnalyticsGoalRecord[],
  scope: AnalyticsScope,
) {
  const groupedGoals = new Map<string, AnalyticsGoalRecord[]>();

  for (const goal of goals) {
    const groupName =
      scope === "admin"
        ? goal.owner.department ?? "Unassigned"
        : getEmployeeName(goal);
    const currentGoals = groupedGoals.get(groupName) ?? [];

    currentGoals.push(goal);
    groupedGoals.set(groupName, currentGoals);
  }

  return Array.from(groupedGoals.entries())
    .map(([name, groupGoals]) => {
      const progressValues = groupGoals.map(getGoalProgress);
      const completedCount = groupGoals.filter((goal, index) =>
        isGoalComplete(goal, progressValues[index] ?? 0),
      ).length;
      const overdueCount = groupGoals.filter((goal, index) =>
        isGoalOverdue(goal, progressValues[index] ?? 0),
      ).length;
      const averageProgress =
        progressValues.length > 0
          ? Math.round(
              progressValues.reduce((total, value) => total + value, 0) /
                progressValues.length,
            )
          : 0;

      return {
        name,
        goalCount: groupGoals.length,
        averageProgress,
        completionRate: toPercentage(completedCount, groupGoals.length),
        overdueCount,
      };
    })
    .sort((first, second) => second.averageProgress - first.averageProgress)
    .slice(0, 8);
}

function buildProgressTrend(updates: TrendUpdateRecord[]) {
  const groupedUpdates = new Map<
    string,
    {
      period: string;
      sortKey: string;
      progressValues: number[];
      completedCount: number;
      updateCount: number;
    }
  >();

  for (const update of updates) {
    const reviewCycle = update.goal.reviewCycle;
    const period = `Q${reviewCycle.quarter} ${reviewCycle.year}`;
    const sortKey = `${reviewCycle.year}-${String(reviewCycle.quarter).padStart(
      2,
      "0",
    )}`;
    const progress = calculateQuarterlyProgress({
      measurementType: update.goal.measurementType,
      startValue: update.goal.startValue,
      targetValue: update.goal.targetValue,
      currentValue: update.goal.currentValue,
      achievementValue: update.progressValue,
      dueDate: update.goal.timelineTarget,
      createdAt: update.goal.createdAt,
    });
    const currentGroup = groupedUpdates.get(sortKey) ?? {
      period,
      sortKey,
      progressValues: [],
      completedCount: 0,
      updateCount: 0,
    };

    currentGroup.progressValues.push(progress);
    currentGroup.updateCount += 1;

    if (
      update.quarterlyStatus === QuarterlyStatus.COMPLETED ||
      progress >= 100
    ) {
      currentGroup.completedCount += 1;
    }

    groupedUpdates.set(sortKey, currentGroup);
  }

  return Array.from(groupedUpdates.values())
    .sort((first, second) => first.sortKey.localeCompare(second.sortKey))
    .slice(-6)
    .map((item) => ({
      period: item.period,
      sortKey: item.sortKey,
      averageProgress:
        item.progressValues.length > 0
          ? Math.round(
              item.progressValues.reduce((total, value) => total + value, 0) /
                item.progressValues.length,
            )
          : 0,
      completedCount: item.completedCount,
      updateCount: item.updateCount,
    }));
}

function getGoalScopeWhere(input: {
  reviewCycleId: string;
  managerId?: string;
}): Prisma.GoalWhereInput {
  return {
    reviewCycleId: input.reviewCycleId,
    isArchived: false,
    ...(input.managerId
      ? {
          owner: {
            managerId: input.managerId,
            isActive: true,
          },
        }
      : {}),
  };
}

function getTrendScopeWhere(managerId?: string): Prisma.GoalUpdateWhereInput {
  return {
    goal: {
      isArchived: false,
      ...(managerId
        ? {
            owner: {
              managerId,
              isActive: true,
            },
          }
        : {}),
    },
  };
}

async function getDashboardAnalytics(input: {
  scope: AnalyticsScope;
  managerId?: string;
}): Promise<DashboardAnalytics> {
  const activeReviewCycle = await prisma.reviewCycle.findFirst({
    where: { isActive: true },
    orderBy: [{ year: "desc" }, { quarter: "desc" }, { startDate: "desc" }],
    select: {
      id: true,
      name: true,
      year: true,
      quarter: true,
      startDate: true,
      endDate: true,
    },
  });

  const employeeWhere: Prisma.UserWhereInput =
    input.scope === "manager"
      ? { managerId: input.managerId, isActive: true }
      : { role: UserRole.EMPLOYEE, isActive: true };

  const activeEmployeeCount = await prisma.user.count({
    where: employeeWhere,
  });

  if (!activeReviewCycle) {
    return {
      scope: input.scope,
      reviewCycle: null,
      totalGoals: 0,
      approvedGoals: 0,
      submittedGoals: 0,
      reviewedGoals: 0,
      approvalRate: 0,
      completionPercentage: 0,
      overduePercentage: 0,
      overdueGoals: 0,
      activeEmployeeCount,
      averageProgress: 0,
      statusDistribution: buildStatusDistribution([], 0),
      progressTrend: [],
      teamPerformance: [],
    };
  }

  const goalWhere = getGoalScopeWhere({
    reviewCycleId: activeReviewCycle.id,
    managerId: input.managerId,
  });

  const [totalGoals, statusCounts, goals, trendUpdates] = await Promise.all([
    prisma.goal.count({ where: goalWhere }),
    prisma.goal.groupBy({
      by: ["status"],
      where: goalWhere,
      _count: { _all: true },
    }),
    prisma.goal.findMany({
      where: goalWhere,
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      select: analyticsGoalSelect,
    }),
    prisma.goalUpdate.findMany({
      where: getTrendScopeWhere(input.managerId),
      orderBy: [
        { goal: { reviewCycle: { year: "asc" } } },
        { goal: { reviewCycle: { quarter: "asc" } } },
        { createdAt: "asc" },
      ],
      select: trendUpdateSelect,
    }),
  ]);

  const countByStatus = new Map(
    statusCounts.map((item) => [item.status, item._count._all]),
  );
  const approvedGoals =
    (countByStatus.get(GoalStatus.APPROVED) ?? 0) +
    (countByStatus.get(GoalStatus.LOCKED) ?? 0);
  const submittedGoals = countByStatus.get(GoalStatus.SUBMITTED) ?? 0;
  const reviewedGoals =
    submittedGoals +
    approvedGoals +
    (countByStatus.get(GoalStatus.REJECTED) ?? 0);
  const progressValues = goals.map(getGoalProgress);
  const completedGoals = goals.filter((goal, index) =>
    isGoalComplete(goal, progressValues[index] ?? 0),
  ).length;
  const overdueGoals = goals.filter((goal, index) =>
    isGoalOverdue(goal, progressValues[index] ?? 0),
  ).length;
  const averageProgress =
    progressValues.length > 0
      ? Math.round(
          progressValues.reduce((total, value) => total + value, 0) /
            progressValues.length,
        )
      : 0;

  return {
    scope: input.scope,
    reviewCycle: {
      ...activeReviewCycle,
      label: formatReviewCycleLabel(activeReviewCycle),
    },
    totalGoals,
    approvedGoals,
    submittedGoals,
    reviewedGoals,
    approvalRate: toPercentage(approvedGoals, reviewedGoals),
    completionPercentage: toPercentage(completedGoals, totalGoals),
    overduePercentage: toPercentage(overdueGoals, totalGoals),
    overdueGoals,
    activeEmployeeCount,
    averageProgress,
    statusDistribution: buildStatusDistribution(statusCounts, totalGoals),
    progressTrend: buildProgressTrend(trendUpdates),
    teamPerformance: buildTeamPerformance(goals, input.scope),
  };
}

export function getAdminAnalytics() {
  return getDashboardAnalytics({ scope: "admin" });
}

export function getManagerAnalytics(managerId: string) {
  return getDashboardAnalytics({ scope: "manager", managerId });
}
