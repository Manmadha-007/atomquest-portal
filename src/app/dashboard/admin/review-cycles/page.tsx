import { GoalStatus, UserRole, type Prisma } from "@prisma/client";
import { FileClock, Lock, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { GoalLockDialog } from "@/components/admin/goal-lock-dialog";
import { ReviewCycleForm } from "@/components/admin/review-cycle-form";
import {
  ReviewCyclesTable,
  type ReviewCycleTableRow,
} from "@/components/admin/review-cycles-table";
import { EmployeeGoalStatusBadge } from "@/components/goals/employee-goal-status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardPathForRole, SIGN_IN_PATH } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const reviewCycleSelect = {
  id: true,
  name: true,
  year: true,
  quarter: true,
  status: true,
  startDate: true,
  endDate: true,
  submissionDeadline: true,
  lockDate: true,
  isActive: true,
  createdBy: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  _count: {
    select: { goals: true },
  },
} as const satisfies Prisma.ReviewCycleSelect;

const governanceGoalSelect = {
  id: true,
  title: true,
  status: true,
  lockedAt: true,
  owner: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
      department: true,
    },
  },
  reviewCycle: {
    select: {
      name: true,
      year: true,
      quarter: true,
    },
  },
} as const satisfies Prisma.GoalSelect;

type ReviewCycleRecord = Prisma.ReviewCycleGetPayload<{
  select: typeof reviewCycleSelect;
}>;
type GovernanceGoalRecord = Prisma.GoalGetPayload<{
  select: typeof governanceGoalSelect;
}>;

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

function formatPerson(
  person?: { firstName: string; lastName: string; email: string } | null,
) {
  if (!person) {
    return "System";
  }

  return `${person.firstName} ${person.lastName}`.trim() || person.email;
}

function mapReviewCycleToRow(
  reviewCycle: ReviewCycleRecord,
): ReviewCycleTableRow {
  return {
    id: reviewCycle.id,
    name: reviewCycle.name,
    year: reviewCycle.year,
    quarter: reviewCycle.quarter,
    status: reviewCycle.status,
    isActive: reviewCycle.isActive,
    startDateLabel: formatDate(reviewCycle.startDate),
    endDateLabel: formatDate(reviewCycle.endDate),
    submissionDeadlineLabel: formatDate(reviewCycle.submissionDeadline),
    lockDateLabel: formatDate(reviewCycle.lockDate),
    goalCount: reviewCycle._count.goals,
    createdByLabel: formatPerson(reviewCycle.createdBy),
  };
}

function getOwnerName(goal: GovernanceGoalRecord) {
  return `${goal.owner.firstName} ${goal.owner.lastName}`.trim() || goal.owner.email;
}

export default async function AdminReviewCyclesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`${SIGN_IN_PATH}?callbackUrl=/dashboard/admin/review-cycles`);
  }

  if (session.user.role !== UserRole.ADMIN) {
    redirect(getDashboardPathForRole(session.user.role));
  }

  const [reviewCycles, governanceGoals, activeCycleCount, lockedGoalCount] =
    await Promise.all([
      prisma.reviewCycle.findMany({
        orderBy: [{ year: "desc" }, { quarter: "desc" }, { startDate: "desc" }],
        select: reviewCycleSelect,
      }),
      prisma.goal.findMany({
        where: {
          isArchived: false,
          status: { in: [GoalStatus.APPROVED, GoalStatus.LOCKED] },
          reviewCycle: { isActive: true },
        },
        orderBy: [{ updatedAt: "desc" }],
        take: 12,
        select: governanceGoalSelect,
      }),
      prisma.reviewCycle.count({ where: { isActive: true } }),
      prisma.goal.count({
        where: { isArchived: false, status: GoalStatus.LOCKED },
      }),
    ]);

  const cycleRows = reviewCycles.map(mapReviewCycleToRow);

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="relative isolate p-6 sm:p-8">
          <div className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 bg-gradient-to-l from-blue-500/10 via-emerald-500/5 to-transparent lg:block" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Admin governance
              </div>
              <div className="space-y-2">
                <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                  Review cycle governance
                </h1>
                <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                  Govern quarterly cycle windows, activation state, goal locks,
                  and audit-ready administrative controls.
                </p>
              </div>
            </div>
            <div className="rounded-xl border bg-background/80 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Active cycles
              </p>
              <p className="mt-1 font-semibold">{activeCycleCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Only one cycle should remain active.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Total cycles</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <FileClock className="size-5 text-muted-foreground" />
              {reviewCycles.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Active cycle count</CardDescription>
            <CardTitle className="text-2xl">{activeCycleCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="rounded-lg">
          <CardHeader className="pb-2">
            <CardDescription>Locked goals</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Lock className="size-5 text-muted-foreground" />
              {lockedGoalCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <ReviewCycleForm />
      <ReviewCyclesTable cycles={cycleRows} />

      <Card className="rounded-lg">
        <CardHeader className="border-b">
          <CardTitle>Goal lock governance</CardTitle>
          <CardDescription>
            Lock or unlock approved goals in the active review cycle.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {governanceGoals.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No approved or locked goals are available in the active cycle.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="h-11 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                      Goal
                    </TableHead>
                    <TableHead className="h-11 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                      Owner
                    </TableHead>
                    <TableHead className="h-11 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                      Cycle
                    </TableHead>
                    <TableHead className="h-11 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="h-11 px-4 text-xs uppercase tracking-wide text-muted-foreground" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {governanceGoals.map((goal) => {
                    const ownerName = getOwnerName(goal);

                    return (
                      <TableRow key={goal.id} className="hover:bg-muted/30">
                        <TableCell className="min-w-72 px-4 py-4">
                          <p className="line-clamp-2 font-medium">
                            {goal.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {goal.lockedAt
                              ? `Locked ${formatDate(goal.lockedAt)}`
                              : "Available for lock governance"}
                          </p>
                        </TableCell>
                        <TableCell className="min-w-44 px-4 py-4">
                          <p className="font-medium">{ownerName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {goal.owner.department ?? "No department"}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-muted-foreground">
                          Q{goal.reviewCycle.quarter} {goal.reviewCycle.year}
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <EmployeeGoalStatusBadge status={goal.status} />
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <div className="flex justify-end">
                            <GoalLockDialog
                              goal={{
                                id: goal.id,
                                title: goal.title,
                                ownerName,
                                locked: goal.status === GoalStatus.LOCKED,
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
