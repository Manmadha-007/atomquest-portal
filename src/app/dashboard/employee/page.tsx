import { GoalStatus, UserRole, type Prisma } from "@prisma/client";
import { ClipboardList } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CreateGoalForm } from "@/components/goals/create-goal-form";
import { EmployeeGoalSummary } from "@/components/goals/employee-goal-summary";
import {
  EmployeeGoalsTable,
  type EmployeeGoalTableRow,
} from "@/components/goals/employee-goals-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardPathForRole, SIGN_IN_PATH } from "@/lib/auth";
import { calculateGoalProgress } from "@/lib/goals/goal-progress";
import { prisma } from "@/lib/prisma";

const goalSelect = {
  id: true,
  parentGoalId: true,
  isPrimaryOwner: true,
  title: true,
  description: true,
  thrustArea: true,
  status: true,
  measurementType: true,
  startValue: true,
  targetValue: true,
  currentValue: true,
  timelineTarget: true,
  weight: true,
  priority: true,
  createdAt: true,
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
} as const satisfies Prisma.GoalSelect;

type EmployeeGoalRecord = Prisma.GoalGetPayload<{ select: typeof goalSelect }>;

function toNumber(value?: Prisma.Decimal | null) {
  return value === null || value === undefined ? null : Number(value);
}

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

function formatReviewCycleLabel(
  reviewCycle: {
    name: string;
    year: number;
    quarter: number;
    startDate: Date;
    endDate: Date;
  } | null,
) {
  if (!reviewCycle) {
    return "No active review cycle";
  }

  return `${reviewCycle.name} - Q${reviewCycle.quarter} ${reviewCycle.year}`;
}

function isGoalOverdue(goal: EmployeeGoalRecord, progressPercentage: number) {
  if (!goal.timelineTarget || progressPercentage >= 100) {
    return false;
  }

  if (goal.status === GoalStatus.REJECTED || goal.status === GoalStatus.LOCKED) {
    return false;
  }

  return goal.timelineTarget < new Date();
}

function mapGoalToTableRow(goal: EmployeeGoalRecord): EmployeeGoalTableRow {
  const progressSource = goal.parentGoal ?? goal;
  const latestProgressValue = progressSource.updates[0]?.progressValue;
  const currentValue = latestProgressValue ?? progressSource.currentValue;
  const progressPercentage = calculateGoalProgress({
    measurementType: progressSource.measurementType,
    startValue: toNumber(progressSource.startValue),
    targetValue: toNumber(progressSource.targetValue),
    currentValue: toNumber(currentValue),
    dueDate: progressSource.timelineTarget,
    createdAt: progressSource.createdAt,
  });
  const primaryOwnerName = goal.parentGoal
    ? `${goal.parentGoal.owner.firstName} ${goal.parentGoal.owner.lastName}`.trim()
    : null;

  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    thrustArea: goal.thrustArea,
    status: goal.status,
    measurementType: goal.measurementType,
    weightage: goal.weight,
    progressPercentage,
    dueDateLabel: formatDate(progressSource.timelineTarget),
    priority: goal.priority,
    isSharedGoal: Boolean(goal.parentGoalId) || !goal.isPrimaryOwner,
    primaryOwnerName,
  };
}

export default async function EmployeeDashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`${SIGN_IN_PATH}?callbackUrl=/dashboard/employee`);
  }

  if (session.user.role !== UserRole.EMPLOYEE) {
    redirect(getDashboardPathForRole(session.user.role));
  }

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

  const goals = activeReviewCycle
    ? await prisma.goal.findMany({
        where: {
          ownerId: session.user.id,
          reviewCycleId: activeReviewCycle.id,
          isArchived: false,
        },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        select: goalSelect,
      })
    : [];

  const tableRows = goals.map(mapGoalToTableRow);
  const metrics = {
    totalGoals: goals.length,
    totalWeightage: goals.reduce((total, goal) => total + goal.weight, 0),
    approvedGoals: goals.filter((goal) => goal.status === GoalStatus.APPROVED)
      .length,
    draftGoals: goals.filter((goal) => goal.status === GoalStatus.DRAFT).length,
    overdueGoals: goals.filter((goal, index) =>
      isGoalOverdue(goal, tableRows[index]?.progressPercentage ?? 0),
    ).length,
  };

  const reviewCycleLabel = formatReviewCycleLabel(activeReviewCycle);

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="relative isolate p-6 sm:p-8">
          <div className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent lg:block" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <ClipboardList className="size-3.5" aria-hidden="true" />
                Employee goal workspace
              </div>
              <div className="space-y-2">
                <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                  My quarterly goals
                </h1>
                <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                  Track active cycle commitments, goal weightage, approval
                  readiness, and KPI progress from one focused workspace.
                </p>
              </div>
            </div>
            <div className="rounded-xl border bg-background/80 p-4 shadow-sm">
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
            </div>
          </div>
        </div>
      </section>

      <EmployeeGoalSummary metrics={metrics} />

      {!activeReviewCycle ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>No active review cycle</CardTitle>
            <CardDescription>
              Goal planning opens once an administrator activates the current
              quarterly review cycle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your historical goals remain available to enterprise reporting,
              but this workspace only shows active cycle goals.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <EmployeeGoalsTable
            goals={tableRows}
            reviewCycleLabel={reviewCycleLabel}
          />
          <CreateGoalForm />
        </>
      )}
    </div>
  );
}
