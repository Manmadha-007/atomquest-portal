import {
  ApprovalDecision,
  GoalStatus,
  QuarterlyStatus,
  UserRole,
  type Prisma,
} from "@prisma/client";
import {
  AlertTriangle,
  Clock3,
  ClipboardCheck,
  Gauge,
  TrendingDown,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CompletionMonitoringTable } from "@/components/analytics/completion-monitoring-table";
import { ProgressTrendChart } from "@/components/analytics/progress-trend-chart";
import {
  TeamActivityFeed,
  type TeamActivityFeedItem,
  type TeamActivityFeedItemType,
} from "@/components/analytics/team-activity-feed";
import {
  TeamProgressOverview,
  type TeamProgressOverviewMetrics,
} from "@/components/analytics/team-progress-overview";
import {
  TeamProgressTable,
  type TeamProgressApprovalState,
  type TeamProgressTableRow,
  type TeamProgressUpdateRecency,
} from "@/components/analytics/team-progress-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getManagerAnalytics } from "@/lib/analytics/dashboard-analytics";
import { getDashboardPathForRole, SIGN_IN_PATH } from "@/lib/auth";
import { calculateQuarterlyProgress } from "@/lib/goals/quarterly-progress";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const STALE_UPDATE_DAYS = 21;

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

const teamProgressGoalSelect = {
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
  priority: true,
  submittedAt: true,
  approvedAt: true,
  rejectedAt: true,
  lockedAt: true,
  createdAt: true,
  owner: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      title: true,
      department: true,
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
  approvals: {
    orderBy: [{ version: "desc" }, { stepOrder: "asc" }, { updatedAt: "desc" }],
    take: 1,
    select: {
      decision: true,
      decidedAt: true,
      updatedAt: true,
    },
  },
} as const satisfies Prisma.GoalSelect;

const teamActivityLogSelect = {
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
      owner: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  },
} as const satisfies Prisma.AuditLogSelect;

const teamActivityActions = [
  "GOAL_APPROVED",
  "GOAL_LOCKED",
  "GOAL_QUARTERLY_UPDATE_CREATED",
  "GOAL_REJECTED",
  "GOAL_SUBMITTED",
  "GOAL_UNLOCKED",
  "GOAL_UPDATE_SEEDED",
  "SHARED_GOAL_PROPAGATED",
  "SHARED_GOAL_WEIGHTAGE_UPDATED",
] as const;

type TeamProgressGoalRecord = Prisma.GoalGetPayload<{
  select: typeof teamProgressGoalSelect;
}>;
type TeamActivityLogRecord = Prisma.AuditLogGetPayload<{
  select: typeof teamActivityLogSelect;
}>;

type ProgressSource = {
  measurementType: TeamProgressGoalRecord["measurementType"];
  startValue: TeamProgressGoalRecord["startValue"];
  targetValue: TeamProgressGoalRecord["targetValue"];
  currentValue: TeamProgressGoalRecord["currentValue"];
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
  icon: LucideIcon;
  tone: string;
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

function formatEnumLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function daysSince(value: Date, now = new Date()) {
  return Math.max(
    0,
    Math.floor((now.getTime() - value.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function getProgressSource(goal: TeamProgressGoalRecord): ProgressSource {
  return goal.parentGoal ?? goal;
}

function getGoalProgress(goal: TeamProgressGoalRecord) {
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

function isSharedGoal(goal: TeamProgressGoalRecord) {
  return Boolean(goal.parentGoalId) || !goal.isPrimaryOwner;
}

function isGoalOverdue(goal: TeamProgressGoalRecord, progress: number) {
  const progressSource = getProgressSource(goal);

  if (!progressSource.timelineTarget || progress >= 100) {
    return false;
  }

  if (goal.status === GoalStatus.REJECTED || goal.status === GoalStatus.LOCKED) {
    return false;
  }

  return progressSource.timelineTarget < new Date();
}

function getLatestUpdate(goal: TeamProgressGoalRecord) {
  return getProgressSource(goal).updates[0] ?? null;
}

function getUpdateRecency(input: {
  activeQuarter: number;
  goal: TeamProgressGoalRecord;
  progress: number;
}): {
  label: string;
  recency: TeamProgressUpdateRecency;
} {
  const latestUpdate = getLatestUpdate(input.goal);

  if (!latestUpdate) {
    return { label: "Missing", recency: "missing" };
  }

  if (latestUpdate.quarter !== input.activeQuarter) {
    return { label: `No Q${input.activeQuarter}`, recency: "missing" };
  }

  const ageInDays = daysSince(latestUpdate.updatedAt ?? latestUpdate.createdAt);

  if (ageInDays > STALE_UPDATE_DAYS && input.progress < 100) {
    return { label: `${ageInDays}d stale`, recency: "stale" };
  }

  return { label: ageInDays === 0 ? "Current" : `${ageInDays}d ago`, recency: "current" };
}

function getApprovalState(goal: TeamProgressGoalRecord): {
  detail: string;
  label: string;
  state: TeamProgressApprovalState;
} {
  const latestApproval = goal.approvals[0];

  if (goal.status === GoalStatus.LOCKED) {
    return {
      detail: goal.lockedAt ? `Locked ${formatDate(goal.lockedAt)}` : "Governed",
      label: "Locked",
      state: "locked",
    };
  }

  if (latestApproval?.decision === ApprovalDecision.PENDING) {
    return {
      detail: "Awaiting manager decision",
      label: "Pending review",
      state: "pending",
    };
  }

  if (latestApproval?.decision === ApprovalDecision.REJECTED) {
    return {
      detail: latestApproval.decidedAt
        ? `Rejected ${formatDate(latestApproval.decidedAt)}`
        : "Returned to employee",
      label: "Rejected",
      state: "rejected",
    };
  }

  if (latestApproval?.decision === ApprovalDecision.APPROVED) {
    return {
      detail: latestApproval.decidedAt
        ? `Approved ${formatDate(latestApproval.decidedAt)}`
        : "Manager approved",
      label: "Approved",
      state: "approved",
    };
  }

  if (isSharedGoal(goal)) {
    return {
      detail: "Approved through shared-goal propagation",
      label: "Propagated",
      state: "not_required",
    };
  }

  if (goal.status === GoalStatus.APPROVED) {
    return {
      detail: goal.approvedAt
        ? `Approved ${formatDate(goal.approvedAt)}`
        : "Manager approved",
      label: "Approved",
      state: "approved",
    };
  }

  if (goal.status === GoalStatus.REJECTED) {
    return {
      detail: goal.rejectedAt
        ? `Rejected ${formatDate(goal.rejectedAt)}`
        : "Returned to employee",
      label: "Rejected",
      state: "rejected",
    };
  }

  if (goal.status === GoalStatus.SUBMITTED) {
    return {
      detail: "Awaiting manager decision",
      label: "Pending review",
      state: "pending",
    };
  }

  return {
    detail: "Employee draft",
    label: "Not submitted",
    state: "draft",
  };
}

function getLatestQuarterlyUpdateLabel(goal: TeamProgressGoalRecord) {
  const latestUpdate = getLatestUpdate(goal);

  if (!latestUpdate) {
    return isSharedGoal(goal)
      ? "Awaiting primary-owner update"
      : "No quarterly update recorded";
  }

  return `Q${latestUpdate.quarter} - ${formatDate(latestUpdate.updatedAt ?? latestUpdate.createdAt)}`;
}

function mapGoalToTableRow(
  goal: TeamProgressGoalRecord,
  activeQuarter: number,
): TeamProgressTableRow {
  const progressSource = getProgressSource(goal);
  const latestUpdate = getLatestUpdate(goal);
  const progress = getGoalProgress(goal);
  const overdue = isGoalOverdue(goal, progress);
  const approvalState = getApprovalState(goal);
  const recency = getUpdateRecency({ activeQuarter, goal, progress });

  return {
    id: goal.id,
    employeeName: formatPersonName(goal.owner),
    employeeEmail: goal.owner.email,
    employeeTitle: goal.owner.title,
    department: goal.owner.department,
    goalTitle: goal.title,
    goalDescription: goal.description,
    status: goal.status,
    progressPercentage: progress,
    isOverdue: overdue,
    overdueLabel: overdue ? "Overdue" : "On schedule",
    latestQuarterlyStatus: latestUpdate?.quarterlyStatus ?? null,
    latestQuarterlyUpdateLabel: getLatestQuarterlyUpdateLabel(goal),
    updateRecency: recency.recency,
    updateRecencyLabel: recency.label,
    isSharedGoal: isSharedGoal(goal),
    primaryOwnerName: goal.parentGoal
      ? formatPersonName(goal.parentGoal.owner)
      : null,
    approvalState: approvalState.state,
    approvalStateLabel: approvalState.label,
    approvalStateDetail: approvalState.detail,
    dueDateLabel: formatDate(progressSource.timelineTarget),
  };
}

function isAtRisk(row: TeamProgressTableRow) {
  return (
    row.isOverdue ||
    row.updateRecency !== "current" ||
    (row.progressPercentage < 50 &&
      row.status !== GoalStatus.REJECTED &&
      row.status !== GoalStatus.LOCKED)
  );
}

function getTrendMovement(trend: Array<{ averageProgress: number }>) {
  if (trend.length === 0) {
    return "No trend yet";
  }

  if (trend.length === 1) {
    return "First trend point";
  }

  const latest = trend[trend.length - 1]?.averageProgress ?? 0;
  const previous = trend[trend.length - 2]?.averageProgress ?? 0;
  const delta = latest - previous;

  return `${delta >= 0 ? "+" : ""}${delta} pts`;
}

function buildOverviewMetrics(input: {
  analytics: Awaited<ReturnType<typeof getManagerAnalytics>>;
  rows: TeamProgressTableRow[];
}): TeamProgressOverviewMetrics {
  return {
    teamCompletionPercentage: input.analytics.completionPercentage,
    overdueGoals: input.analytics.overdueGoals,
    pendingQuarterlyUpdates:
      input.analytics.completionMonitoring.summary.pendingQuarterlyUpdates,
    averageProgress: input.analytics.averageProgress,
    sharedGoalsCount: input.rows.filter((row) => row.isSharedGoal).length,
    atRiskGoals: input.rows.filter(isAtRisk).length,
  };
}

function buildInsights(input: {
  analytics: Awaited<ReturnType<typeof getManagerAnalytics>>;
  rows: TeamProgressTableRow[];
}): InsightItem[] {
  const staleOrMissingUpdates = input.rows.filter(
    (row) => row.updateRecency !== "current",
  ).length;
  const stagnantGoals = input.rows.filter(
    (row) =>
      row.progressPercentage > 0 &&
      row.progressPercentage < 50 &&
      row.status !== GoalStatus.REJECTED &&
      row.status !== GoalStatus.LOCKED,
  ).length;
  const lowMomentum =
    input.analytics.progressTrend.length > 1 &&
    (input.analytics.progressTrend.at(-1)?.averageProgress ?? 0) <=
      (input.analytics.progressTrend.at(-2)?.averageProgress ?? 0);
  const completionSummary = input.analytics.completionMonitoring.summary;

  return [
    {
      label: "No recent updates",
      value: staleOrMissingUpdates,
      description: "Goals with missing or stale current-quarter signals.",
      icon: Clock3,
      tone: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-800",
    },
    {
      label: "Overdue execution",
      value: input.analytics.overdueGoals,
      description: "Incomplete goals past target dates.",
      icon: AlertTriangle,
      tone: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
    },
    {
      label: "Stagnant progress",
      value: stagnantGoals,
      description: "Goals below 50% progress with no completion signal.",
      icon: Gauge,
      tone: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900",
    },
    {
      label: "Low momentum",
      value: lowMomentum ? "Watch" : getTrendMovement(input.analytics.progressTrend),
      description: "Latest average-progress movement across trend periods.",
      icon: TrendingDown,
      tone: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900",
    },
    {
      label: "Missing submissions",
      value: completionSummary.noSubmissionEmployees,
      description: "Direct reports with required updates but no submissions.",
      icon: ClipboardCheck,
      tone: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900",
    },
  ];
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

function getActivityTitle(log: TeamActivityLogRecord) {
  switch (log.action) {
    case "GOAL_APPROVED":
      return "Goal approved";
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
      return formatEnumLabel(log.action);
  }
}

function getActivityType(action: string): TeamActivityFeedItemType {
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

  if (action === "GOAL_SUBMITTED") {
    return "feedback";
  }

  return "goal";
}

function mapActivityLog(log: TeamActivityLogRecord): TeamActivityFeedItem {
  const goalTitle =
    log.goal?.title ??
    getMetadataValue(log.metadata, ["goalTitle", "title", "parentGoalTitle"]) ??
    `${log.entityType} ${log.entityId.slice(0, 8)}`;
  const progressPercentage = getMetadataValue(log.metadata, [
    "progressPercentage",
  ]);
  const quarterlyStatus = getMetadataValue(log.metadata, ["quarterlyStatus"]);
  const descriptionParts = [
    goalTitle,
    progressPercentage ? `${progressPercentage}% progress` : null,
    quarterlyStatus ? formatEnumLabel(quarterlyStatus) : null,
  ].filter(Boolean);

  return {
    id: log.id,
    type: getActivityType(log.action),
    title: getActivityTitle(log),
    description: descriptionParts.join(" - "),
    actorLabel: `Recorded by ${formatPersonName(log.actor)}`,
    employeeLabel: formatPersonName(log.goal?.owner),
    timestampLabel: formatDateTime(log.createdAt),
  };
}

function AtRiskInsights({ insights }: { insights: InsightItem[] }) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b">
        <CardTitle>At-risk execution insights</CardTitle>
        <CardDescription>
          Lightweight drift signals derived from active goals, update recency,
          completion monitoring, and trend movement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {insights.map((insight) => {
            const Icon = insight.icon;

            return (
              <div key={insight.label} className="rounded-lg border bg-background p-4">
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
        </div>
      </CardContent>
    </Card>
  );
}

export default async function ManagerTeamProgressPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`${SIGN_IN_PATH}?callbackUrl=/dashboard/manager/team-progress`);
  }

  if (session.user.role !== UserRole.MANAGER) {
    redirect(getDashboardPathForRole(session.user.role));
  }

  const analytics = await getManagerAnalytics(session.user.id);
  const reviewCycle = analytics.reviewCycle;
  const reviewCycleLabel = reviewCycle?.label ?? "No active review cycle";

  const [goals, activityLogs] = reviewCycle
    ? await Promise.all([
        prisma.goal.findMany({
          where: {
            reviewCycleId: reviewCycle.id,
            isArchived: false,
            owner: {
              managerId: session.user.id,
              isActive: true,
            },
          },
          orderBy: [
            { owner: { lastName: "asc" } },
            { owner: { firstName: "asc" } },
            { priority: "asc" },
            { createdAt: "asc" },
          ],
          select: teamProgressGoalSelect,
        }),
        prisma.auditLog.findMany({
          where: {
            action: { in: [...teamActivityActions] },
            goal: {
              reviewCycleId: reviewCycle.id,
              isArchived: false,
              owner: {
                managerId: session.user.id,
                isActive: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: teamActivityLogSelect,
        }),
      ])
    : [[], []];

  const rows = goals
    .map((goal) => mapGoalToTableRow(goal, reviewCycle?.quarter ?? 0))
    .sort((first, second) => {
      if (isAtRisk(first) !== isAtRisk(second)) {
        return isAtRisk(first) ? -1 : 1;
      }

      return first.progressPercentage - second.progressPercentage;
    });
  const overviewMetrics = buildOverviewMetrics({ analytics, rows });
  const insights = buildInsights({ analytics, rows });
  const activityItems = activityLogs.map(mapActivityLog);

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="relative isolate p-6 sm:p-8">
          <div className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 bg-gradient-to-l from-emerald-500/10 via-sky-500/5 to-transparent lg:block" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <UsersRound className="size-3.5" aria-hidden="true" />
                Manager execution oversight
              </div>
              <div className="space-y-2">
                <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                  Team progress
                </h1>
                <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                  Identify execution drift, overdue exposure, quarterly momentum,
                  pending submissions, stagnant goals, and team completion health
                  across direct reports.
                </p>
              </div>
            </div>
            <div className="rounded-xl border bg-background/80 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Active cycle
              </p>
              <p className="mt-1 font-semibold">{reviewCycleLabel}</p>
              {reviewCycle ? (
                <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                  <p>
                    {formatDate(reviewCycle.startDate)} to{" "}
                    {formatDate(reviewCycle.endDate)}
                  </p>
                  <p>
                    Submission deadline:{" "}
                    {formatDate(reviewCycle.submissionDeadline)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <TeamProgressOverview metrics={overviewMetrics} />

      {!reviewCycle ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>No active review cycle</CardTitle>
            <CardDescription>
              Team progress monitoring opens once an administrator activates a
              quarterly review cycle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Direct-report execution drift, submission monitoring, and activity
              feeds are scoped to the active review cycle.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <AtRiskInsights insights={insights} />
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <ProgressTrendChart data={analytics.progressTrend} />
            <TeamActivityFeed items={activityItems} />
          </div>
          <TeamProgressTable goals={rows} reviewCycleLabel={reviewCycleLabel} />
          <CompletionMonitoringTable
            completionMonitoring={analytics.completionMonitoring}
            scopeLabel="direct reports"
          />
        </>
      )}
    </div>
  );
}
