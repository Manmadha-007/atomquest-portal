import {
  ApprovalDecision,
  GoalStatus,
  QuarterlyStatus,
  UserRole,
  type GoalMeasurementType,
  type Prisma,
} from "@prisma/client";

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
  submissionDeadline: Date | null;
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

export type ProgressTrendSource = {
  quarter: number;
  progressValue?: Prisma.Decimal | number | string | null;
  quarterlyStatus: QuarterlyStatus;
  goal: {
    measurementType: GoalMeasurementType;
    startValue?: Prisma.Decimal | number | string | null;
    targetValue?: Prisma.Decimal | number | string | null;
    currentValue?: Prisma.Decimal | number | string | null;
    timelineTarget?: Date | string | null;
    createdAt: Date | string;
    reviewCycle: {
      name: string;
      year: number;
      quarter: number;
    };
  };
};

export type TeamPerformanceDatum = {
  name: string;
  goalCount: number;
  averageProgress: number;
  completionRate: number;
  overdueCount: number;
};

export type CompletionStatus =
  | "completed"
  | "pending"
  | "overdue"
  | "reviewed"
  | "awaiting_review";

export type CompletionMonitoringSummary = {
  completedQuarterlyUpdates: number;
  pendingQuarterlyUpdates: number;
  overdueQuarterlyUpdates: number;
  noSubmissionEmployees: number;
  reviewedSubmissions: number;
  pendingReviews: number;
  overdueReviews: number;
  quarterlyCompletionPercentage: number;
  managerReviewPercentage: number;
};

export type CompletionMonitoringRow = {
  id: string;
  employeeName: string;
  employeeEmail: string;
  managerName: string;
  reviewCycleLabel: string;
  quarterlySubmissionStatus: CompletionStatus;
  quarterlySubmissionLabel: string;
  managerReviewStatus: CompletionStatus;
  managerReviewLabel: string;
  lastUpdateTimestamp: string;
  completionPercentage: number;
  isOverdue: boolean;
  overdueLabel: string;
  completedQuarterlyUpdates: number;
  pendingQuarterlyUpdates: number;
  overdueQuarterlyUpdates: number;
  reviewedSubmissions: number;
  pendingReviews: number;
  overdueReviews: number;
};

export type CompletionMonitoring = {
  summary: CompletionMonitoringSummary;
  rows: CompletionMonitoringRow[];
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
  completionMonitoring: CompletionMonitoring;
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

const completionEmployeeSelect = {
  id: true,
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
} as const satisfies Prisma.UserSelect;

const completionGoalSelect = {
  id: true,
  ownerId: true,
  status: true,
  submittedAt: true,
  parentGoalId: true,
  isPrimaryOwner: true,
  measurementType: true,
  startValue: true,
  targetValue: true,
  currentValue: true,
  timelineTarget: true,
  createdAt: true,
  updates: {
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      quarter: true,
      progressValue: true,
      quarterlyStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  approvals: {
    orderBy: [{ decidedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      decision: true,
      decidedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const satisfies Prisma.GoalSelect;

type AnalyticsGoalRecord = Prisma.GoalGetPayload<{
  select: typeof analyticsGoalSelect;
}>;
type TrendUpdateRecord = Prisma.GoalUpdateGetPayload<{
  select: typeof trendUpdateSelect;
}>;
type CompletionEmployeeRecord = Prisma.UserGetPayload<{
  select: typeof completionEmployeeSelect;
}>;
type CompletionGoalRecord = Prisma.GoalGetPayload<{
  select: typeof completionGoalSelect;
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

function formatPersonName(person: {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  return (
    `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() ||
    person.email ||
    "Unknown user"
  );
}

function formatDateTime(value?: Date | null) {
  if (!value) {
    return "No current-quarter update";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function getEmptyCompletionMonitoring(): CompletionMonitoring {
  return {
    summary: {
      completedQuarterlyUpdates: 0,
      pendingQuarterlyUpdates: 0,
      overdueQuarterlyUpdates: 0,
      noSubmissionEmployees: 0,
      reviewedSubmissions: 0,
      pendingReviews: 0,
      overdueReviews: 0,
      quarterlyCompletionPercentage: 0,
      managerReviewPercentage: 0,
    },
    rows: [],
  };
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
  return formatPersonName(goal.owner);
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

export function buildProgressTrendData(
  updates: ProgressTrendSource[],
): ProgressTrendDatum[] {
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

function buildProgressTrend(updates: TrendUpdateRecord[]) {
  return buildProgressTrendData(updates);
}

function getCurrentQuarterUpdate(goal: CompletionGoalRecord, quarter: number) {
  return goal.updates.find((update) => update.quarter === quarter) ?? null;
}

function isGoalReviewed(goal: CompletionGoalRecord) {
  if (
    goal.status === GoalStatus.APPROVED ||
    goal.status === GoalStatus.REJECTED ||
    goal.status === GoalStatus.LOCKED
  ) {
    return true;
  }

  return goal.approvals.some(
    (approval) => approval.decision !== ApprovalDecision.PENDING,
  );
}

function getLatestUpdateTimestamp(
  goals: CompletionGoalRecord[],
  quarter: number,
) {
  return goals.reduce<Date | null>((latestTimestamp, goal) => {
    const update = getCurrentQuarterUpdate(goal, quarter);
    const updateTimestamp = update?.updatedAt ?? update?.createdAt ?? null;

    if (!updateTimestamp) {
      return latestTimestamp;
    }

    if (!latestTimestamp || updateTimestamp > latestTimestamp) {
      return updateTimestamp;
    }

    return latestTimestamp;
  }, null);
}

function getSubmissionStatus(input: {
  completedCount: number;
  isPastDue: boolean;
  requiredCount: number;
}): { label: string; status: CompletionStatus } {
  if (input.requiredCount === 0) {
    return { label: "No required updates", status: "pending" };
  }

  if (input.completedCount >= input.requiredCount) {
    return { label: "Completed", status: "completed" };
  }

  if (input.isPastDue) {
    return {
      label: input.completedCount > 0 ? "Partially overdue" : "Overdue",
      status: "overdue",
    };
  }

  return {
    label: input.completedCount > 0 ? "Partially submitted" : "No submission",
    status: "pending",
  };
}

function getManagerReviewStatus(input: {
  isPastDue: boolean;
  pendingCount: number;
  reviewableCount: number;
  reviewedCount: number;
}): { label: string; status: CompletionStatus } {
  if (input.reviewableCount === 0) {
    return { label: "No submissions", status: "pending" };
  }

  if (input.pendingCount === 0) {
    return { label: "Reviewed", status: "reviewed" };
  }

  if (input.isPastDue) {
    return { label: "Overdue review", status: "overdue" };
  }

  if (input.reviewedCount > 0) {
    return { label: "Partially reviewed", status: "awaiting_review" };
  }

  return { label: "Awaiting review", status: "awaiting_review" };
}

function getOverdueLabel(input: {
  overdueReviews: number;
  overdueUpdates: number;
}) {
  if (input.overdueUpdates > 0 && input.overdueReviews > 0) {
    return "Submission and review overdue";
  }

  if (input.overdueUpdates > 0) {
    return "Submission overdue";
  }

  if (input.overdueReviews > 0) {
    return "Review overdue";
  }

  return "On schedule";
}

function buildCompletionMonitoring(input: {
  employees: CompletionEmployeeRecord[];
  goals: CompletionGoalRecord[];
  reviewCycle: Pick<
    AnalyticsReviewCycle,
    "endDate" | "label" | "quarter" | "submissionDeadline"
  >;
}): CompletionMonitoring {
  const goalsByOwnerId = new Map<string, CompletionGoalRecord[]>();
  const dueDate = input.reviewCycle.submissionDeadline ?? input.reviewCycle.endDate;
  const isPastDue = dueDate < new Date();

  for (const goal of input.goals) {
    const ownerGoals = goalsByOwnerId.get(goal.ownerId) ?? [];

    ownerGoals.push(goal);
    goalsByOwnerId.set(goal.ownerId, ownerGoals);
  }

  const rows = input.employees.map((employee) => {
    const employeeGoals = goalsByOwnerId.get(employee.id) ?? [];
    const quarterlyUpdateGoals = employeeGoals.filter(
      (goal) =>
        goal.status === GoalStatus.APPROVED &&
        goal.isPrimaryOwner &&
        !goal.parentGoalId,
    );
    const completedQuarterlyUpdates = quarterlyUpdateGoals.filter((goal) =>
      Boolean(getCurrentQuarterUpdate(goal, input.reviewCycle.quarter)),
    ).length;
    const pendingQuarterlyUpdates =
      quarterlyUpdateGoals.length - completedQuarterlyUpdates;
    const overdueQuarterlyUpdates = isPastDue ? pendingQuarterlyUpdates : 0;
    const submittedGoals = employeeGoals.filter(
      (goal) => goal.status === GoalStatus.SUBMITTED,
    );
    const reviewedGoals = employeeGoals.filter(isGoalReviewed);
    const reviewedSubmissions = reviewedGoals.length;
    const pendingReviews = submittedGoals.length;
    const overdueReviews = isPastDue ? pendingReviews : 0;
    const reviewableCount = reviewedSubmissions + pendingReviews;
    const quarterlyStatus = getSubmissionStatus({
      completedCount: completedQuarterlyUpdates,
      isPastDue,
      requiredCount: quarterlyUpdateGoals.length,
    });
    const managerReviewStatus = getManagerReviewStatus({
      isPastDue,
      pendingCount: pendingReviews,
      reviewableCount,
      reviewedCount: reviewedSubmissions,
    });
    const latestUpdateTimestamp = getLatestUpdateTimestamp(
      quarterlyUpdateGoals,
      input.reviewCycle.quarter,
    );
    const overdueLabel = getOverdueLabel({
      overdueReviews,
      overdueUpdates: overdueQuarterlyUpdates,
    });

    return {
      id: employee.id,
      employeeName: formatPersonName(employee),
      employeeEmail: employee.email,
      managerName: employee.manager
        ? formatPersonName(employee.manager)
        : "Unassigned",
      reviewCycleLabel: input.reviewCycle.label,
      quarterlySubmissionStatus: quarterlyStatus.status,
      quarterlySubmissionLabel: quarterlyStatus.label,
      managerReviewStatus: managerReviewStatus.status,
      managerReviewLabel: managerReviewStatus.label,
      lastUpdateTimestamp: formatDateTime(latestUpdateTimestamp),
      completionPercentage: toPercentage(
        completedQuarterlyUpdates,
        quarterlyUpdateGoals.length,
      ),
      isOverdue: overdueQuarterlyUpdates > 0 || overdueReviews > 0,
      overdueLabel,
      completedQuarterlyUpdates,
      pendingQuarterlyUpdates,
      overdueQuarterlyUpdates,
      reviewedSubmissions,
      pendingReviews,
      overdueReviews,
    } satisfies CompletionMonitoringRow;
  });

  const summary = rows.reduce<CompletionMonitoringSummary>(
    (totals, row) => {
      totals.completedQuarterlyUpdates += row.completedQuarterlyUpdates;
      totals.pendingQuarterlyUpdates += row.pendingQuarterlyUpdates;
      totals.overdueQuarterlyUpdates += row.overdueQuarterlyUpdates;
      totals.reviewedSubmissions += row.reviewedSubmissions;
      totals.pendingReviews += row.pendingReviews;
      totals.overdueReviews += row.overdueReviews;

      if (
        row.completedQuarterlyUpdates === 0 &&
        row.pendingQuarterlyUpdates > 0
      ) {
        totals.noSubmissionEmployees += 1;
      }

      return totals;
    },
    getEmptyCompletionMonitoring().summary,
  );
  const totalQuarterlyUpdates =
    summary.completedQuarterlyUpdates + summary.pendingQuarterlyUpdates;
  const totalReviews = summary.reviewedSubmissions + summary.pendingReviews;

  summary.quarterlyCompletionPercentage = toPercentage(
    summary.completedQuarterlyUpdates,
    totalQuarterlyUpdates,
  );
  summary.managerReviewPercentage = toPercentage(
    summary.reviewedSubmissions,
    totalReviews,
  );

  return {
    summary,
    rows: rows.sort((first, second) => {
      if (first.isOverdue !== second.isOverdue) {
        return first.isOverdue ? -1 : 1;
      }

      return first.employeeName.localeCompare(second.employeeName);
    }),
  };
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
      submissionDeadline: true,
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
      completionMonitoring: getEmptyCompletionMonitoring(),
    };
  }

  const goalWhere = getGoalScopeWhere({
    reviewCycleId: activeReviewCycle.id,
    managerId: input.managerId,
  });

  const [
    totalGoals,
    statusCounts,
    goals,
    trendUpdates,
    completionEmployees,
    completionGoals,
  ] = await Promise.all([
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
    prisma.user.findMany({
      where: employeeWhere,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: completionEmployeeSelect,
    }),
    prisma.goal.findMany({
      where: goalWhere,
      orderBy: [{ owner: { lastName: "asc" } }, { createdAt: "asc" }],
      select: completionGoalSelect,
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
    completionMonitoring: buildCompletionMonitoring({
      employees: completionEmployees,
      goals: completionGoals,
      reviewCycle: {
        ...activeReviewCycle,
        label: formatReviewCycleLabel(activeReviewCycle),
      },
    }),
  };
}

export function getAdminAnalytics() {
  return getDashboardAnalytics({ scope: "admin" });
}

export function getManagerAnalytics(managerId: string) {
  return getDashboardAnalytics({ scope: "manager", managerId });
}
