import { GoalStatus, UserRole, type Prisma } from "@prisma/client";
import {
  AlertTriangle,
  ClipboardCheck,
  ShieldCheck,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import {
  EmployeesTable,
  type EmployeeDirectoryTableRow,
} from "@/components/admin/employees-table";
import { DashboardAuthState } from "@/components/layout/dashboard-auth-state";
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
import type { CompletionStatus } from "@/lib/analytics/types";
import { getAdminAnalytics } from "@/lib/analytics/dashboard-analytics";
import { getDashboardUser } from "@/lib/auth/session";
import { calculateGoalProgress } from "@/lib/goals/goal-progress";
import { prisma } from "@/lib/prisma";

const EMPTY_REVIEW_CYCLE_ID = "00000000-0000-4000-8000-000000000000";

const directoryGoalSelect = {
  id: true,
  status: true,
  measurementType: true,
  startValue: true,
  targetValue: true,
  currentValue: true,
  timelineTarget: true,
  createdAt: true,
  parentGoal: {
    select: {
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

const directoryUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  title: true,
  department: true,
  role: true,
  isActive: true,
  createdAt: true,
  manager: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  goalsOwned: {
    select: directoryGoalSelect,
  },
} as const satisfies Prisma.UserSelect;

type DirectoryGoalRecord = Prisma.GoalGetPayload<{
  select: typeof directoryGoalSelect;
}>;
type DirectoryUserRecord = Prisma.UserGetPayload<{
  select: typeof directoryUserSelect;
}>;

type DirectoryMetric = {
  description: string;
  icon: LucideIcon;
  label: string;
  value: number | string;
};

function formatDate(
  value?: Date | string | null,
) {
  if (!value) {
    return "Not set";
  }

  const parsedDate =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  ).format(parsedDate);
}

function formatPersonName(person: {
  email: string;
  firstName: string;
  lastName: string;
}) {
  return `${person.firstName} ${person.lastName}`.trim() || person.email;
}

function toNumber(value?: Prisma.Decimal | null) {
  return value === null || value === undefined ? null : Number(value);
}

function getGoalProgress(goal: DirectoryGoalRecord) {
  const progressSource = goal.parentGoal ?? goal;
  const latestProgressValue = progressSource.updates[0]?.progressValue;
  const currentValue = latestProgressValue ?? progressSource.currentValue;

  return calculateGoalProgress({
    measurementType: progressSource.measurementType,
    startValue: toNumber(progressSource.startValue),
    targetValue: toNumber(progressSource.targetValue),
    currentValue: toNumber(currentValue),
    dueDate: progressSource.timelineTarget,
    createdAt: progressSource.createdAt,
  });
}

function isGoalOverdue(goal: DirectoryGoalRecord, now: Date) {
  const progressSource = goal.parentGoal ?? goal;
  const progress = getGoalProgress(goal);

  if (!progressSource.timelineTarget || progress >= 100) {
    return false;
  }

  if (goal.status === GoalStatus.REJECTED || goal.status === GoalStatus.LOCKED) {
    return false;
  }

  return progressSource.timelineTarget < now;
}

function getSearchText(input: {
  department: string | null;
  email: string;
  managerName: string | null;
  name: string;
  role: UserRole;
  title: string | null;
}) {
  return [
    input.name,
    input.email,
    input.title,
    input.department,
    input.managerName,
    input.role,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function mapUserToRow(input: {
  completionByEmployeeId: Map<
    string,
    {
      completionPercentage: number;
      quarterlySubmissionLabel: string;
      quarterlySubmissionStatus: CompletionStatus;
    }
  >;
  now: Date;
  user: DirectoryUserRecord;
}): EmployeeDirectoryTableRow {
  const { completionByEmployeeId, now, user } = input;
  const name = formatPersonName(user);
  const managerName = user.manager ? formatPersonName(user.manager) : null;
  const completion = completionByEmployeeId.get(user.id);
  const tracksQuarterlyCompletion =
    user.role === UserRole.EMPLOYEE && Boolean(completion);
  const activeGoalsCount = user.goalsOwned.length;
  const pendingApprovals = user.goalsOwned.filter(
    (goal) => goal.status === GoalStatus.SUBMITTED,
  ).length;
  const overdueGoals = user.goalsOwned.filter((goal) =>
    isGoalOverdue(goal, now),
  ).length;

  return {
    id: user.id,
    name,
    email: user.email,
    role: user.role,
    title: user.title,
    department: user.department,
    managerName,
    isActive: user.isActive,
    activeGoalsCount,
    completionPercentage: tracksQuarterlyCompletion
      ? completion?.completionPercentage ?? 0
      : null,
    pendingApprovals,
    overdueGoals,
    quarterlyStatus: completion?.quarterlySubmissionStatus ?? "pending",
    quarterlyStatusLabel:
      user.role === UserRole.EMPLOYEE
        ? completion?.quarterlySubmissionLabel ?? "No active cycle"
        : "Not tracked",
    createdDateLabel: formatDate(user.createdAt),
    searchText: getSearchText({
      department: user.department,
      email: user.email,
      managerName,
      name,
      role: user.role,
      title: user.title,
    }),
  };
}

function buildMetrics(rows: EmployeeDirectoryTableRow[]): DirectoryMetric[] {
  const activeUsers = rows.filter((row) => row.isActive).length;
  const managerCount = rows.filter((row) => row.role === UserRole.MANAGER).length;
  const employeeCount = rows.filter(
    (row) => row.role === UserRole.EMPLOYEE,
  ).length;
  const pendingApprovals = rows.reduce(
    (total, row) => total + row.pendingApprovals,
    0,
  );
  const overdueGoals = rows.reduce((total, row) => total + row.overdueGoals, 0);

  return [
    {
      label: "Total users",
      value: rows.length,
      description: `${activeUsers} active workforce records.`,
      icon: UsersRound,
    },
    {
      label: "Employees",
      value: employeeCount,
      description: "Individual contributors in the goal workflow.",
      icon: UserRound,
    },
    {
      label: "Managers",
      value: managerCount,
      description: "People managers with direct-report visibility.",
      icon: ShieldCheck,
    },
    {
      label: "Pending approvals",
      value: pendingApprovals,
      description: "Submitted goals awaiting manager decision.",
      icon: ClipboardCheck,
    },
    {
      label: "Overdue goals",
      value: overdueGoals,
      description: "Active-cycle goals past target date.",
      icon: AlertTriangle,
    },
  ];
}

export default async function AdminEmployeesPage() {
  const user = await getDashboardUser();

  if (!user || user.role !== "ADMIN") {
    return <DashboardAuthState requiredRole="ADMIN" userRole={user?.role} />;
  }

  const analytics = await getAdminAnalytics();
  const activeReviewCycleId = analytics.reviewCycle?.id ?? EMPTY_REVIEW_CYCLE_ID;
  const users: DirectoryUserRecord[] = await prisma.user.findMany({
    orderBy: [
      { role: "asc" },
      { lastName: "asc" },
      { firstName: "asc" },
      { email: "asc" },
    ],
    select: {
      ...directoryUserSelect,
      goalsOwned: {
        where: {
          reviewCycleId: activeReviewCycleId,
          isArchived: false,
        },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        select: directoryGoalSelect,
      },
    },
  });

  const completionByEmployeeId = new Map(
    analytics.completionMonitoring.rows.map((row) => [
      row.id,
      {
        completionPercentage: row.completionPercentage,
        quarterlySubmissionLabel: row.quarterlySubmissionLabel,
        quarterlySubmissionStatus: row.quarterlySubmissionStatus,
      },
    ]),
  );
  const now = new Date();
  const tableRows = users.map((user) =>
    mapUserToRow({ completionByEmployeeId, now, user }),
  );
  const metrics = buildMetrics(tableRows);
  const reviewCycleLabel =
    analytics.reviewCycle?.label ?? "no active review cycle";

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Admin workforce directory"
        gradientClassName="from-blue-500/10 via-emerald-500/5 to-transparent"
        icon={UsersRound}
        title="Employees"
        description="Inspect role coverage, manager relationships, active-cycle goal load, completion readiness, and approval exposure across the enterprise workforce."
      >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Current cycle
              </p>
              <p className="mt-1 font-semibold">{reviewCycleLabel}</p>
              {analytics.reviewCycle ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(analytics.reviewCycle.startDate)} to{" "}
                  {formatDate(analytics.reviewCycle.endDate)}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Workforce records remain visible without cycle analytics.
                </p>
              )}
      </DashboardHero>

      <DashboardMetricGrid
        ariaLabel="Workforce directory summary"
        className="xl:grid-cols-5"
      >
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <Card className="h-full rounded-lg" key={metric.label}>
              <CardHeader className="grid-cols-[1fr_auto] items-start gap-3 pb-2">
                <div className="space-y-1">
                  <CardDescription>{metric.label}</CardDescription>
                  <CardTitle className="text-2xl">{metric.value}</CardTitle>
                </div>
                <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs leading-5 text-muted-foreground">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </DashboardMetricGrid>

      <EmployeesTable
        employees={tableRows}
        reviewCycleLabel={reviewCycleLabel}
      />
    </DashboardPage>
  );
}
