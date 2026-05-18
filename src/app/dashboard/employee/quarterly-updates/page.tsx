import { GoalStatus, type Prisma } from "@prisma/client";
import { Activity, CheckCircle2, ClipboardList, ListChecks } from "lucide-react";

import { DashboardAuthState } from "@/components/layout/dashboard-auth-state";
import {
  DashboardHero,
  DashboardMetricGrid,
  DashboardPage,
} from "@/components/layout/dashboard-page";
import {
  QuarterlyUpdateForm,
  type QuarterlyUpdateGoalOption,
} from "@/components/goals/quarterly-update-form";
import {
  QuarterlyUpdatesTable,
  type QuarterlyUpdateTableRow,
} from "@/components/goals/quarterly-updates-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardUser } from "@/lib/auth/session";
import {
  calculateQuarterlyProgress,
  formatAchievementValue,
  getLatestCommentary,
} from "@/lib/goals/quarterly-progress";
import { prisma } from "@/lib/prisma";

const approvedGoalSelect = {
  id: true,
  title: true,
  measurementType: true,
  unit: true,
  startValue: true,
  targetValue: true,
  currentValue: true,
  timelineTarget: true,
  createdAt: true,
  updates: {
    orderBy: { createdAt: "desc" },
    select: {
      quarter: true,
      progressValue: true,
      createdAt: true,
    },
  },
} as const satisfies Prisma.GoalSelect;

const updateSelect = {
  id: true,
  quarter: true,
  summary: true,
  progressValue: true,
  quarterlyStatus: true,
  createdAt: true,
  goal: {
    select: {
      title: true,
      measurementType: true,
      unit: true,
      startValue: true,
      targetValue: true,
      currentValue: true,
      timelineTarget: true,
      createdAt: true,
    },
  },
} as const satisfies Prisma.GoalUpdateSelect;

type ApprovedGoalRecord = Prisma.GoalGetPayload<{
  select: typeof approvedGoalSelect;
}>;
type QuarterlyUpdateRecord = Prisma.GoalUpdateGetPayload<{
  select: typeof updateSelect;
}>;

function formatDate(value?: Date | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
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

function mapGoalToOption(
  goal: ApprovedGoalRecord,
  activeQuarter: number,
): QuarterlyUpdateGoalOption {
  const latestUpdate = goal.updates[0];
  const currentProgress = calculateQuarterlyProgress({
    measurementType: goal.measurementType,
    startValue: goal.startValue,
    targetValue: goal.targetValue,
    currentValue: goal.currentValue,
    achievementValue: latestUpdate?.progressValue,
    dueDate: goal.timelineTarget,
    createdAt: goal.createdAt,
  });

  return {
    id: goal.id,
    title: goal.title,
    measurementType: goal.measurementType,
    unit: goal.unit,
    currentProgressLabel: `${currentProgress}% current progress`,
    hasCurrentQuarterUpdate: goal.updates.some(
      (update) => update.quarter === activeQuarter,
    ),
  };
}

function mapUpdateToTableRow(
  update: QuarterlyUpdateRecord,
): QuarterlyUpdateTableRow {
  const progressPercentage = calculateQuarterlyProgress({
    measurementType: update.goal.measurementType,
    startValue: update.goal.startValue,
    targetValue: update.goal.targetValue,
    currentValue: update.goal.currentValue,
    achievementValue: update.progressValue,
    dueDate: update.goal.timelineTarget,
    createdAt: update.goal.createdAt,
  });

  return {
    id: update.id,
    goalTitle: update.goal.title,
    progressPercentage,
    quarterlyStatus: update.quarterlyStatus,
    achievementValueLabel: formatAchievementValue(
      update.progressValue,
      update.goal.unit,
    ),
    updatedDateLabel: formatDate(update.createdAt),
    latestCommentary: getLatestCommentary(update.summary),
  };
}

export default async function QuarterlyUpdatesPage() {
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

  const [approvedGoals, updates] = activeReviewCycle
    ? await Promise.all([
        prisma.goal.findMany({
          where: {
            ownerId: userId,
            reviewCycleId: activeReviewCycle.id,
            status: GoalStatus.APPROVED,
            isArchived: false,
            parentGoalId: null,
          },
          orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
          select: approvedGoalSelect,
        }),
        prisma.goalUpdate.findMany({
          where: {
            createdById: userId,
            goal: {
              ownerId: userId,
              reviewCycleId: activeReviewCycle.id,
              isArchived: false,
              parentGoalId: null,
            },
          },
          orderBy: [{ createdAt: "desc" }],
          select: updateSelect,
        }),
      ])
    : [[], []];

  const reviewCycleLabel = formatReviewCycleLabel(activeReviewCycle);
  const goalOptions = activeReviewCycle
    ? approvedGoals.map((goal) => mapGoalToOption(goal, activeReviewCycle.quarter))
    : [];
  const tableRows = updates.map(mapUpdateToTableRow);
  const updatesThisQuarter = activeReviewCycle
    ? updates.filter((update) => update.quarter === activeReviewCycle.quarter)
        .length
    : 0;
  const averageProgress =
    tableRows.length > 0
      ? Math.round(
          tableRows.reduce((total, row) => total + row.progressPercentage, 0) /
            tableRows.length,
        )
      : 0;
  const openApprovedGoals = goalOptions.filter(
    (goal) => !goal.hasCurrentQuarterUpdate,
  ).length;

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Quarterly check-in workflow"
        gradientClassName="from-sky-500/10 via-primary/5 to-transparent"
        icon={ListChecks}
        title="Quarterly updates"
        description="Submit progress snapshots for approved goals, capture risks, and preserve an auditable execution history."
      >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Active cycle
              </p>
              <p className="mt-1 font-semibold">{reviewCycleLabel}</p>
              {activeReviewCycle ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(activeReviewCycle.startDate)} to{" "}
                  {formatDate(activeReviewCycle.endDate)}
                </p>
              ) : null}
      </DashboardHero>

      <DashboardMetricGrid
        ariaLabel="Quarterly update summary"
        className="md:grid-cols-4"
      >
        <Card className="h-full rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Approved goals</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CheckCircle2 className="size-5 text-muted-foreground" />
              {approvedGoals.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="h-full rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Open updates</CardDescription>
            <CardTitle className="text-2xl">{openApprovedGoals}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="h-full rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>This quarter</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ClipboardList className="size-5 text-muted-foreground" />
              {updatesThisQuarter}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="h-full rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Average progress</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Activity className="size-5 text-muted-foreground" />
              {averageProgress}%
            </CardTitle>
          </CardHeader>
        </Card>
      </DashboardMetricGrid>

      {!activeReviewCycle ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>No active review cycle</CardTitle>
            <CardDescription>
              Quarterly updates open once an administrator activates the current
              review cycle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Approved goals and historical updates remain available to
              reporting, but this workspace only accepts updates for the active
              cycle.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <QuarterlyUpdateForm
            goals={goalOptions}
            reviewCycleLabel={reviewCycleLabel}
          />
          <QuarterlyUpdatesTable
            updates={tableRows}
            reviewCycleLabel={reviewCycleLabel}
          />
        </>
      )}
    </DashboardPage>
  );
}
