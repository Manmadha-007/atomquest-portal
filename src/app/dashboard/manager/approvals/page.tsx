import { GoalStatus, type Prisma } from "@prisma/client";
import { ClipboardCheck, UsersRound } from "lucide-react";

import {
  ManagerApprovalsTable,
  type ManagerApprovalTableRow,
} from "@/components/goals/manager-approvals-table";
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
import { calculateGoalProgress } from "@/lib/goals/goal-progress";
import { prisma } from "@/lib/prisma";

const managerApprovalGoalSelect = {
  id: true,
  title: true,
  status: true,
  measurementType: true,
  startValue: true,
  targetValue: true,
  currentValue: true,
  timelineTarget: true,
  weight: true,
  priority: true,
  submittedAt: true,
  createdAt: true,
  owner: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
      title: true,
      department: true,
    },
  },
  updates: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: {
      progressValue: true,
      createdAt: true,
    },
  },
} as const satisfies Prisma.GoalSelect;

type ManagerApprovalGoalRecord = Prisma.GoalGetPayload<{
  select: typeof managerApprovalGoalSelect;
}>;

function toNumber(value?: Prisma.Decimal | null) {
  return value === null || value === undefined ? null : Number(value);
}

function formatDate(value?: Date | null) {
  if (!value) {
    return "Not submitted";
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

function getEmployeeName(goal: ManagerApprovalGoalRecord) {
  return `${goal.owner.firstName} ${goal.owner.lastName}`.trim();
}

function mapGoalToTableRow(
  goal: ManagerApprovalGoalRecord,
): ManagerApprovalTableRow {
  const latestProgressValue = goal.updates[0]?.progressValue;
  const currentValue = latestProgressValue ?? goal.currentValue;
  const progressPercentage = calculateGoalProgress({
    measurementType: goal.measurementType,
    startValue: toNumber(goal.startValue),
    targetValue: toNumber(goal.targetValue),
    currentValue: toNumber(currentValue),
    dueDate: goal.timelineTarget,
    createdAt: goal.createdAt,
  });

  return {
    id: goal.id,
    employeeName: getEmployeeName(goal),
    employeeEmail: goal.owner.email,
    employeeTitle: goal.owner.title,
    department: goal.owner.department,
    title: goal.title,
    measurementType: goal.measurementType,
    weightage: goal.weight,
    priority: goal.priority,
    submittedDateLabel: formatDate(goal.submittedAt),
    progressPercentage,
    status: goal.status,
  };
}

export default async function ManagerApprovalsPage() {
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
      startDate: true,
      endDate: true,
      submissionDeadline: true,
    },
  });

  const [directReportCount, submittedGoals] = await Promise.all([
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
            status: GoalStatus.SUBMITTED,
            isArchived: false,
            owner: {
              managerId,
              isActive: true,
            },
          },
          orderBy: [
            { submittedAt: "asc" },
            { priority: "asc" },
            { createdAt: "asc" },
          ],
          select: managerApprovalGoalSelect,
        })
      : Promise.resolve([]),
  ]);

  const reviewCycleLabel = formatReviewCycleLabel(activeReviewCycle);
  const tableRows = submittedGoals.map(mapGoalToTableRow);

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Manager approval workflow"
        gradientClassName="from-emerald-500/10 via-primary/5 to-transparent"
        icon={ClipboardCheck}
        title="Goal approvals"
        description="Review submitted goals from direct reports, capture manager decisions, and maintain an auditable quarterly approval trail."
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
        ariaLabel="Goal approval queue summary"
        className="md:grid-cols-3"
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
            <CardDescription>Pending decisions</CardDescription>
            <CardTitle className="text-2xl">{tableRows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="h-full rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Review mode</CardDescription>
            <CardTitle className="text-base">Submitted goals only</CardTitle>
          </CardHeader>
        </Card>
      </DashboardMetricGrid>

      {!activeReviewCycle ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>No active review cycle</CardTitle>
            <CardDescription>
              Manager approvals open once an administrator activates a quarterly
              review cycle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Submitted goals are scoped to the active cycle and direct-report
              hierarchy before approval actions are available.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ManagerApprovalsTable
          goals={tableRows}
          reviewCycleLabel={reviewCycleLabel}
        />
      )}
    </DashboardPage>
  );
}
