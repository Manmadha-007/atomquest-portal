import {
  ApprovalDecision,
  GoalStatus,
  QuarterlyStatus,
  type Prisma,
} from "@prisma/client";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileClock,
  GitBranch,
  UsersRound,
} from "lucide-react";

import {
  ManagerTeamGoalsTable,
  type ManagerTeamGoalApprovalState,
  type ManagerTeamGoalTableRow,
} from "@/components/goals/manager-team-goals-table";
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
import { getDashboardUser } from "@/lib/auth/session";
import { calculateQuarterlyProgress } from "@/lib/goals/quarterly-progress";
import { prisma } from "@/lib/prisma";

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

const managerTeamGoalSelect = {
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
  weight: true,
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

type ManagerTeamGoalRecord = Prisma.GoalGetPayload<{
  select: typeof managerTeamGoalSelect;
}>;

type ProgressSource = {
  measurementType: ManagerTeamGoalRecord["measurementType"];
  startValue: ManagerTeamGoalRecord["startValue"];
  targetValue: ManagerTeamGoalRecord["targetValue"];
  currentValue: ManagerTeamGoalRecord["currentValue"];
  timelineTarget: Date | null;
  createdAt: Date;
  updates: Array<{
    progressValue: Prisma.Decimal | null;
    quarterlyStatus: QuarterlyStatus;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

function formatDate(value?: Date | null) {
  if (!value) {
    return "Not set";
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

function formatPersonName(person: {
  email: string;
  firstName: string;
  lastName: string;
}) {
  return `${person.firstName} ${person.lastName}`.trim() || person.email;
}

function getProgressSource(goal: ManagerTeamGoalRecord): ProgressSource {
  return goal.parentGoal ?? goal;
}

function getGoalProgress(goal: ManagerTeamGoalRecord) {
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

function isGoalOverdue(goal: ManagerTeamGoalRecord, progress: number) {
  const progressSource = getProgressSource(goal);

  if (!progressSource.timelineTarget || progress >= 100) {
    return false;
  }

  if (goal.status === GoalStatus.REJECTED || goal.status === GoalStatus.LOCKED) {
    return false;
  }

  return progressSource.timelineTarget < new Date();
}

function getLatestQuarterlyUpdate(goal: ManagerTeamGoalRecord) {
  const progressSource = getProgressSource(goal);

  return progressSource.updates[0] ?? null;
}

function getLatestQuarterlyUpdateLabel(goal: ManagerTeamGoalRecord) {
  const latestUpdate = getLatestQuarterlyUpdate(goal);

  if (!latestUpdate) {
    return "No quarterly update recorded";
  }

  return `Updated ${formatDate(latestUpdate.updatedAt ?? latestUpdate.createdAt)}`;
}

function getApprovalState(
  goal: ManagerTeamGoalRecord,
): {
  detail: string;
  state: ManagerTeamGoalApprovalState;
} {
  const latestApproval = goal.approvals[0];

  if (goal.status === GoalStatus.LOCKED) {
    return {
      detail: goal.lockedAt ? `Locked ${formatDate(goal.lockedAt)}` : "Governed",
      state: "locked",
    };
  }

  if (latestApproval?.decision === ApprovalDecision.PENDING) {
    return {
      detail: "Awaiting manager decision",
      state: "pending",
    };
  }

  if (latestApproval?.decision === ApprovalDecision.REJECTED) {
    return {
      detail: latestApproval.decidedAt
        ? `Rejected ${formatDate(latestApproval.decidedAt)}`
        : "Returned to employee",
      state: "rejected",
    };
  }

  if (latestApproval?.decision === ApprovalDecision.APPROVED) {
    return {
      detail: latestApproval.decidedAt
        ? `Approved ${formatDate(latestApproval.decidedAt)}`
        : "Manager approved",
      state: "approved",
    };
  }

  if (goal.parentGoalId || !goal.isPrimaryOwner) {
    return {
      detail: "Approved through shared-goal propagation",
      state: "not_required",
    };
  }

  if (goal.status === GoalStatus.APPROVED) {
    return {
      detail: goal.approvedAt
        ? `Approved ${formatDate(goal.approvedAt)}`
        : "Manager approved",
      state: "approved",
    };
  }

  if (goal.status === GoalStatus.REJECTED) {
    return {
      detail: goal.rejectedAt
        ? `Rejected ${formatDate(goal.rejectedAt)}`
        : "Returned to employee",
      state: "rejected",
    };
  }

  if (goal.status === GoalStatus.SUBMITTED) {
    return {
      detail: "Awaiting manager decision",
      state: "pending",
    };
  }

  return {
    detail: "Employee draft",
    state: "draft",
  };
}

function mapGoalToTableRow(goal: ManagerTeamGoalRecord): ManagerTeamGoalTableRow {
  const progressSource = getProgressSource(goal);
  const latestUpdate = getLatestQuarterlyUpdate(goal);
  const progressPercentage = getGoalProgress(goal);
  const isOverdue = isGoalOverdue(goal, progressPercentage);
  const isSharedGoal = Boolean(goal.parentGoalId) || !goal.isPrimaryOwner;
  const approvalState = getApprovalState(goal);

  return {
    id: goal.id,
    employeeName: formatPersonName(goal.owner),
    employeeEmail: goal.owner.email,
    employeeTitle: goal.owner.title,
    department: goal.owner.department,
    title: goal.title,
    description: goal.description,
    status: goal.status,
    progressPercentage,
    isSharedGoal,
    primaryOwnerName: goal.parentGoal
      ? formatPersonName(goal.parentGoal.owner)
      : null,
    isOverdue,
    overdueLabel: isOverdue ? "Overdue" : "On schedule",
    dueDateLabel: formatDate(progressSource.timelineTarget),
    latestQuarterlyStatus: latestUpdate?.quarterlyStatus ?? null,
    latestQuarterlyUpdateLabel: getLatestQuarterlyUpdateLabel(goal),
    approvalState: approvalState.state,
    approvalStateDetail: approvalState.detail,
  };
}

export default async function ManagerTeamGoalsPage() {
  const user = await getDashboardUser();

  if (!user || user.role !== "MANAGER") {
    return <DashboardAuthState requiredRole="MANAGER" userRole={user?.role} />;
  }

  const managerId = user.id;

  const activeReviewCycle = await prisma.reviewCycle.findFirst({
    where: { isActive: true },
    orderBy: [{ year: "desc" }, { quarter: "desc" }, { startDate: "desc" }],
    select: {
      id: true,
      name: true,
      year: true,
      quarter: true,
      status: true,
      startDate: true,
      endDate: true,
      submissionDeadline: true,
      lockDate: true,
    },
  });

  const [directReportCount, goals] = await Promise.all([
    prisma.user.count({
      where: {
        managerId,
        isActive: true,
      },
    }),
    activeReviewCycle
      ? prisma.goal.findMany({
          where: {
            reviewCycleId: activeReviewCycle.id,
            isArchived: false,
            owner: {
              managerId,
              isActive: true,
            },
          },
          orderBy: [
            { owner: { lastName: "asc" } },
            { owner: { firstName: "asc" } },
            { priority: "asc" },
            { createdAt: "asc" },
          ],
          select: managerTeamGoalSelect,
        })
      : Promise.resolve([]),
  ]);

  const reviewCycleLabel = formatReviewCycleLabel(activeReviewCycle);
  const rows = goals.map(mapGoalToTableRow);
  const sharedGoalCount = rows.filter((goal) => goal.isSharedGoal).length;
  const overdueGoalCount = rows.filter((goal) => goal.isOverdue).length;
  const pendingApprovalCount = rows.filter(
    (goal) => goal.approvalState === "pending",
  ).length;
  const averageProgress =
    rows.length > 0
      ? Math.round(
          rows.reduce((total, row) => total + row.progressPercentage, 0) /
            rows.length,
        )
      : 0;

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Manager operating workspace"
        gradientClassName="from-emerald-500/10 via-sky-500/5 to-transparent"
        icon={ClipboardList}
        title="Team goals"
        description="Monitor direct-report goals, propagated shared KPIs, progress health, overdue exposure, and approval state in the active review cycle."
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
                    Submission: {formatDate(activeReviewCycle.submissionDeadline)}
                  </p>
                  <p>Lock date: {formatDate(activeReviewCycle.lockDate)}</p>
                </div>
              ) : null}
      </DashboardHero>

      <DashboardMetricGrid
        ariaLabel="Team goal portfolio summary"
        className="md:grid-cols-3 xl:grid-cols-5"
      >
        <Card className="h-full rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Direct reports</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <UsersRound className="size-5 text-muted-foreground" />
              {directReportCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="h-full rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Active goals</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CheckCircle2 className="size-5 text-muted-foreground" />
              {rows.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="h-full rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Shared goals</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <GitBranch className="size-5 text-muted-foreground" />
              {sharedGoalCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="h-full rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Overdue goals</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <AlertTriangle className="size-5 text-muted-foreground" />
              {overdueGoalCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="h-full rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Average progress</CardDescription>
            <CardTitle className="text-2xl">{averageProgress}%</CardTitle>
          </CardHeader>
        </Card>
      </DashboardMetricGrid>

      <DashboardMetricGrid
        ariaLabel="Team goal governance summary"
        className="md:grid-cols-2"
      >
        <Card className="h-full rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Pending approvals</CardDescription>
            <CardTitle className="text-2xl">{pendingApprovalCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="h-full rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Governance state</CardDescription>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileClock className="size-5 text-muted-foreground" />
              {activeReviewCycle?.status ?? "No active cycle"}
            </CardTitle>
          </CardHeader>
        </Card>
      </DashboardMetricGrid>

      {!activeReviewCycle ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>No active review cycle</CardTitle>
            <CardDescription>
              Team goal visibility opens once an administrator activates a
              quarterly review cycle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Direct-report goals, shared-goal propagation, progress updates,
              and approval state are scoped to the active cycle.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ManagerTeamGoalsTable
          goals={rows}
          reviewCycleLabel={reviewCycleLabel}
        />
      )}
    </DashboardPage>
  );
}
