import {
  ApprovalDecision,
  GoalStatus,
  QuarterlyStatus,
  type Prisma,
} from "@prisma/client";
import {
  Activity,
  AlertTriangle,
  Clock3,
  ListChecks,
  TrendingUp,
} from "lucide-react";

import { ProgressTrendChart } from "@/components/analytics/progress-trend-chart";
import {
  EmployeeActivityFeed,
  type EmployeeActivityFeedItem,
  type EmployeeActivityFeedItemType,
} from "@/components/goals/employee-activity-feed";
import {
  EmployeeProgressOverview,
  type EmployeeProgressOverviewMetrics,
} from "@/components/goals/employee-progress-overview";
import {
  EmployeeProgressTable,
  type EmployeeProgressTableRow,
} from "@/components/goals/employee-progress-table";
import {
  DashboardHero,
  DashboardMetricGrid,
  DashboardPage,
} from "@/components/layout/dashboard-page";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardAuthState } from "@/components/layout/dashboard-auth-state";
import {
  buildProgressTrendData,
} from "@/lib/analytics/dashboard-analytics";
import type { ProgressTrendSource } from "@/lib/analytics/types";
import { getDashboardUser } from "@/lib/auth/session";
import { calculateQuarterlyProgress } from "@/lib/goals/quarterly-progress";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const latestUpdateSelect = {
  orderBy: { createdAt: "desc" },
  take: 1,
  select: {
    quarter: true,
    progressValue: true,
    quarterlyStatus: true,
    createdAt: true,
    updatedAt: true,
  },
} as const;

const progressGoalSelect = {
  id: true,
  parentGoalId: true,
  isPrimaryOwner: true,
  title: true,
  description: true,
  status: true,
  measurementType: true,
  startValue: true,
  targetValue: true,
  currentValue: true,
  timelineTarget: true,
  createdAt: true,
  updatedAt: true,
  parentGoal: {
    select: {
      id: true,
      measurementType: true,
      startValue: true,
      targetValue: true,
      currentValue: true,
      timelineTarget: true,
      createdAt: true,
      owner: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      updates: latestUpdateSelect,
    },
  },
  updates: latestUpdateSelect,
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

const activityLogSelect = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  metadata: true,
  createdAt: true,
  actor: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  goal: {
    select: {
      title: true,
    },
  },
} as const satisfies Prisma.AuditLogSelect;

const approvalFeedbackSelect = {
  id: true,
  decision: true,
  comments: true,
  decidedAt: true,
  updatedAt: true,
  approver: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  goal: {
    select: {
      title: true,
    },
  },
} as const satisfies Prisma.GoalApprovalSelect;

const activityActions = [
  "GOAL_APPROVED",
  "GOAL_CREATED_DRAFT",
  "GOAL_LOCKED",
  "GOAL_QUARTERLY_UPDATE_CREATED",
  "GOAL_REJECTED",
  "GOAL_SUBMITTED",
  "GOAL_UNLOCKED",
  "GOAL_UPDATE_SEEDED",
  "SHARED_GOAL_PROPAGATED",
  "SHARED_GOAL_WEIGHTAGE_UPDATED",
] as const;

type ProgressGoalRecord = Prisma.GoalGetPayload<{
  select: typeof progressGoalSelect;
}>;
type ActivityLogRecord = Prisma.AuditLogGetPayload<{
  select: typeof activityLogSelect;
}>;
type ApprovalFeedbackRecord = Prisma.GoalApprovalGetPayload<{
  select: typeof approvalFeedbackSelect;
}>;

type ProgressSource = {
  measurementType: ProgressGoalRecord["measurementType"];
  startValue: ProgressGoalRecord["startValue"];
  targetValue: ProgressGoalRecord["targetValue"];
  currentValue: ProgressGoalRecord["currentValue"];
  timelineTarget: Date | null;
  createdAt: Date;
  updates: Array<{
    quarter: number;
    progressValue: Prisma.Decimal | null;
    quarterlyStatus: QuarterlyStatus;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

type InsightItem = {
  label: string;
  value: number | string;
  description: string;
  tone: string;
  icon: typeof Activity;
};

type FeedEntry = {
  item: EmployeeActivityFeedItem;
  timestamp: Date;
};

function formatDate(value?: Date | null) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatDateTime(value?: Date | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatReviewCycleLabel(
  reviewCycle: {
    name: string;
    year: number;
    quarter: number;
  } | null,
) {
  if (!reviewCycle) {
    return "No active review cycle";
  }

  return `${reviewCycle.name} - Q${reviewCycle.quarter} ${reviewCycle.year}`;
}

function formatPersonName(person?: {
  email: string;
  firstName: string;
  lastName: string;
} | null) {
  if (!person) {
    return "System";
  }

  return `${person.firstName} ${person.lastName}`.trim() || person.email;
}

function getProgressSource(goal: ProgressGoalRecord): ProgressSource {
  return goal.parentGoal ?? goal;
}

function getGoalProgress(goal: ProgressGoalRecord) {
  const progressSource = getProgressSource(goal);
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

function isGoalComplete(goal: ProgressGoalRecord, progressPercentage: number) {
  const latestUpdate = getProgressSource(goal).updates[0];

  return (
    goal.status === GoalStatus.LOCKED ||
    latestUpdate?.quarterlyStatus === QuarterlyStatus.COMPLETED ||
    progressPercentage >= 100
  );
}

function isGoalOverdue(goal: ProgressGoalRecord, progressPercentage: number) {
  const progressSource = getProgressSource(goal);

  if (!progressSource.timelineTarget || progressPercentage >= 100) {
    return false;
  }

  if (goal.status === GoalStatus.REJECTED || goal.status === GoalStatus.LOCKED) {
    return false;
  }

  return progressSource.timelineTarget < new Date();
}

function isSharedGoal(goal: ProgressGoalRecord) {
  return Boolean(goal.parentGoalId) || !goal.isPrimaryOwner;
}

function getPrimaryOwnerName(goal: ProgressGoalRecord) {
  return goal.parentGoal ? formatPersonName(goal.parentGoal.owner) : null;
}

function getLatestQuarterlyUpdateLabel(goal: ProgressGoalRecord) {
  const latestUpdate = getProgressSource(goal).updates[0];

  if (!latestUpdate) {
    return isSharedGoal(goal)
      ? "Awaiting primary-owner update"
      : "No quarterly update recorded";
  }

  return latestUpdate.quarterlyStatus === QuarterlyStatus.COMPLETED
    ? "Completed in latest update"
    : `Q${latestUpdate.quarter} update recorded`;
}

function mapGoalToTableRow(goal: ProgressGoalRecord): EmployeeProgressTableRow {
  const progressSource = getProgressSource(goal);
  const latestUpdate = progressSource.updates[0];
  const progressPercentage = getGoalProgress(goal);
  const overdue = isGoalOverdue(goal, progressPercentage);

  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    status: goal.status,
    progressPercentage,
    dueDateLabel: formatDate(progressSource.timelineTarget),
    isSharedGoal: isSharedGoal(goal),
    primaryOwnerName: getPrimaryOwnerName(goal),
    isOverdue: overdue,
    overdueLabel: overdue ? "Overdue" : "On schedule",
    latestQuarterlyStatus: latestUpdate?.quarterlyStatus ?? null,
    latestQuarterlyUpdateLabel: getLatestQuarterlyUpdateLabel(goal),
    latestUpdateTimestampLabel: latestUpdate
      ? formatDateTime(latestUpdate.updatedAt ?? latestUpdate.createdAt)
      : "Not updated",
  };
}

function getMetadataValue(metadata: Prisma.JsonValue | null, keys: string[]) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const metadataRecord = metadata as Record<string, Prisma.JsonValue>;

  for (const key of keys) {
    const value = metadataRecord[key];

    if (value !== null && value !== undefined && typeof value !== "object") {
      return String(value);
    }
  }

  return null;
}

function getActivityTitle(log: ActivityLogRecord) {
  switch (log.action) {
    case "GOAL_APPROVED":
      return "Goal approved";
    case "GOAL_CREATED_DRAFT":
      return "Draft goal created";
    case "GOAL_LOCKED":
      return "Goal locked";
    case "GOAL_QUARTERLY_UPDATE_CREATED":
    case "GOAL_UPDATE_SEEDED":
      return "Quarterly update submitted";
    case "GOAL_REJECTED":
      return "Goal rejected";
    case "GOAL_SUBMITTED":
      return "Goal submitted";
    case "GOAL_UNLOCKED":
      return "Goal unlocked";
    case "SHARED_GOAL_PROPAGATED":
      return "Shared goal assigned";
    case "SHARED_GOAL_WEIGHTAGE_UPDATED":
      return "Shared-goal weightage changed";
    default:
      return log.action
        .split("_")
        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
        .join(" ");
  }
}

function getActivityType(action: string): EmployeeActivityFeedItemType {
  if (action === "GOAL_APPROVED") {
    return "approval";
  }

  if (action === "GOAL_REJECTED") {
    return "rejection";
  }

  if (action.startsWith("SHARED_GOAL")) {
    return "shared";
  }

  if (action === "GOAL_LOCKED" || action === "GOAL_UNLOCKED") {
    return "governance";
  }

  if (action.includes("UPDATE")) {
    return "update";
  }

  return "goal";
}

function mapAuditLogToFeedEntry(log: ActivityLogRecord): FeedEntry {
  const goalTitle =
    log.goal?.title ??
    getMetadataValue(log.metadata, ["goalTitle", "title", "parentGoalTitle"]) ??
    `${log.entityType} ${log.entityId.slice(0, 8)}`;
  const progressPercentage = getMetadataValue(log.metadata, [
    "progressPercentage",
  ]);
  const quarterlyStatus = getMetadataValue(log.metadata, ["quarterlyStatus"]);
  const detailParts = [
    goalTitle,
    progressPercentage ? `${progressPercentage}% progress` : null,
    quarterlyStatus ? quarterlyStatus.toLowerCase().replace("_", " ") : null,
  ].filter(Boolean);

  return {
    timestamp: log.createdAt,
    item: {
      id: `audit-${log.id}`,
      type: getActivityType(log.action),
      title: getActivityTitle(log),
      description: detailParts.join(" - "),
      actorLabel: `Recorded by ${formatPersonName(log.actor)}`,
      timestampLabel: formatDateTime(log.createdAt),
    },
  };
}

function mapApprovalFeedbackToFeedEntry(
  approval: ApprovalFeedbackRecord,
): FeedEntry {
  const isRejected = approval.decision === ApprovalDecision.REJECTED;
  const timestamp = approval.decidedAt ?? approval.updatedAt;

  return {
    timestamp,
    item: {
      id: `approval-${approval.id}`,
      type: isRejected ? "rejection" : "feedback",
      title: isRejected ? "Manager rejection feedback" : "Manager feedback",
      description: `${approval.goal.title}: ${
        approval.comments ?? "No comments provided"
      }`,
      actorLabel: `From ${formatPersonName(approval.approver)}`,
      timestampLabel: formatDateTime(timestamp),
    },
  };
}

function buildOverviewMetrics(
  goals: ProgressGoalRecord[],
  rows: EmployeeProgressTableRow[],
): EmployeeProgressOverviewMetrics {
  const completedGoals = goals.filter((goal, index) =>
    isGoalComplete(goal, rows[index]?.progressPercentage ?? 0),
  ).length;
  const averageProgress =
    rows.length > 0
      ? Math.round(
          rows.reduce((total, row) => total + row.progressPercentage, 0) /
            rows.length,
        )
      : 0;

  return {
    activeGoals: rows.length,
    completedGoals,
    overdueGoals: rows.filter((row) => row.isOverdue).length,
    averageProgress,
    sharedGoalsCount: rows.filter((row) => row.isSharedGoal).length,
  };
}

function getLatestTrendMovement(trend: Array<{ averageProgress: number }>) {
  if (trend.length === 0) {
    return "No trend yet";
  }

  if (trend.length === 1) {
    return "First trend point";
  }

  const latest = trend[trend.length - 1];
  const previous = trend[trend.length - 2];
  const delta =
    (latest?.averageProgress ?? 0) - (previous?.averageProgress ?? 0);

  return `${delta >= 0 ? "+" : ""}${delta} pts`;
}

function buildInsights(input: {
  activeQuarter: number;
  goals: ProgressGoalRecord[];
  metrics: EmployeeProgressOverviewMetrics;
  rows: EmployeeProgressTableRow[];
  trendMovement: string;
}): InsightItem[] {
  const ownApprovedGoals = input.goals.filter(
    (goal) =>
      goal.status === GoalStatus.APPROVED &&
      !isSharedGoal(goal) &&
      !isGoalComplete(goal, getGoalProgress(goal)),
  );
  const goalsNeedingUpdates = ownApprovedGoals.filter((goal) => {
    const latestUpdate = getProgressSource(goal).updates[0];

    return latestUpdate?.quarter !== input.activeQuarter;
  }).length;
  const stagnantGoals = input.rows.filter(
    (row) =>
      !row.isSharedGoal &&
      row.progressPercentage > 0 &&
      row.progressPercentage < 50 &&
      row.latestQuarterlyStatus !== QuarterlyStatus.COMPLETED,
  ).length;

  return [
    {
      label: "Needs update",
      value: goalsNeedingUpdates,
      description: "Approved owned goals without a current-quarter update.",
      icon: ListChecks,
      tone: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900",
    },
    {
      label: "Overdue execution",
      value: input.metrics.overdueGoals,
      description: "Incomplete goals past their target date.",
      icon: AlertTriangle,
      tone: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
    },
    {
      label: "Stagnant progress",
      value: stagnantGoals,
      description: "Owned goals below 50% with no completion signal.",
      icon: Clock3,
      tone: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-800",
    },
    {
      label: "Latest movement",
      value: input.trendMovement,
      description: "Average progress change across recent trend periods.",
      icon: TrendingUp,
      tone: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
    },
  ];
}

function ExecutionHealthInsights({ insights }: { insights: InsightItem[] }) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b">
        <CardTitle>Execution health insights</CardTitle>
        <CardDescription>
          Lightweight signals derived from your goals, updates, due dates, and
          shared-goal participation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DashboardMetricGrid className="xl:grid-cols-4">
          {insights.map((insight) => {
            const Icon = insight.icon;

            return (
              <div
                key={insight.label}
                className="h-full rounded-lg border bg-background p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {insight.label}
                    </p>
                    <p className="text-2xl font-semibold tracking-tight">
                      {insight.value}
                    </p>
                  </div>
                  <div className={cn("rounded-lg p-2 ring-1", insight.tone)}>
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {insight.description}
                </p>
              </div>
            );
          })}
        </DashboardMetricGrid>
      </CardContent>
    </Card>
  );
}

export default async function EmployeeProgressTrackerPage() {
  const user = await getDashboardUser();

  if (!user || user.role !== "EMPLOYEE") {
    return <DashboardAuthState requiredRole="EMPLOYEE" userRole={user?.role} />;
  }

  const userId = user.id;

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

  const [goals, trendUpdates, auditLogs, approvalFeedback] =
    await Promise.all([
      activeReviewCycle
        ? prisma.goal.findMany({
            where: {
              ownerId: userId,
              reviewCycleId: activeReviewCycle.id,
              isArchived: false,
            },
            orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
            select: progressGoalSelect,
          })
        : Promise.resolve([]),
      prisma.goalUpdate.findMany({
        where: {
          goal: {
            isArchived: false,
            OR: [
              { ownerId: userId },
              {
                sharedGoals: {
                  some: {
                    ownerId: userId,
                    isArchived: false,
                  },
                },
              },
            ],
          },
        },
        orderBy: [
          { goal: { reviewCycle: { year: "asc" } } },
          { goal: { reviewCycle: { quarter: "asc" } } },
          { createdAt: "asc" },
        ],
        select: trendUpdateSelect,
      }),
      prisma.auditLog.findMany({
        where: {
          action: { in: [...activityActions] },
          OR: [
            { actorId: userId },
            {
              goal: {
                ownerId: userId,
                isArchived: false,
              },
            },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: activityLogSelect,
      }),
      prisma.goalApproval.findMany({
        where: {
          comments: { not: null },
          goal: {
            ownerId: userId,
            isArchived: false,
          },
        },
        orderBy: [{ decidedAt: "desc" }, { updatedAt: "desc" }],
        take: 6,
        select: approvalFeedbackSelect,
      }),
    ]);

  const rows = goals.map(mapGoalToTableRow);
  const metrics = buildOverviewMetrics(goals, rows);
  const reviewCycleLabel = formatReviewCycleLabel(activeReviewCycle);
  const progressTrend = buildProgressTrendData(
    trendUpdates satisfies ProgressTrendSource[],
  );
  const trendMovement = getLatestTrendMovement(progressTrend);
  const insights = buildInsights({
    activeQuarter: activeReviewCycle?.quarter ?? 0,
    goals,
    metrics,
    rows,
    trendMovement,
  });
  const activityItems = [...auditLogs.map(mapAuditLogToFeedEntry), ...approvalFeedback.map(mapApprovalFeedbackToFeedEntry)]
    .sort((first, second) => second.timestamp.getTime() - first.timestamp.getTime())
    .slice(0, 10)
    .map((entry) => entry.item);

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Personal execution intelligence"
        gradientClassName="from-sky-500/10 via-emerald-500/5 to-transparent"
        icon={Activity}
        title="Progress tracker"
        description="Track execution health, quarterly momentum, overdue exposure, shared-goal participation, and recent operating activity from one employee cockpit."
      >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Active cycle
              </p>
              <p className="mt-1 font-semibold">{reviewCycleLabel}</p>
              {activeReviewCycle ? (
                <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                  <p>
                    {formatDate(activeReviewCycle.startDate)} to{" "}
                    {formatDate(activeReviewCycle.endDate)}
                  </p>
                  <p>
                    Submission deadline:{" "}
                    {formatDate(activeReviewCycle.submissionDeadline)}
                  </p>
                </div>
              ) : null}
      </DashboardHero>

      <EmployeeProgressOverview metrics={metrics} />

      {!activeReviewCycle ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>No active review cycle</CardTitle>
            <CardDescription>
              Progress tracking opens once an administrator activates the
              current quarterly review cycle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Historical activity and reporting remain available to analytics,
              but this cockpit focuses on active-cycle execution.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <ExecutionHealthInsights insights={insights} />
          <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr] lg:gap-6">
            <ProgressTrendChart data={progressTrend} />
            <EmployeeActivityFeed items={activityItems} />
          </div>
          <EmployeeProgressTable
            goals={rows}
            reviewCycleLabel={reviewCycleLabel}
          />
        </>
      )}
    </DashboardPage>
  );
}
