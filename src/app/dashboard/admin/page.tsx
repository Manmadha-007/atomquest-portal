import { GoalStatus, type Prisma } from "@prisma/client";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileClock,
  FileText,
  LayoutDashboard,
  ListChecks,
  Lock,
  ShieldCheck,
  Target,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { DashboardAuthState } from "@/components/layout/dashboard-auth-state";
import {
  DashboardHero,
  DashboardMetricGrid,
  DashboardPage,
} from "@/components/layout/dashboard-page";
import { KpiCard } from "@/components/analytics/kpi-card";
import { ExportActions } from "@/components/reports/export-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminAnalytics } from "@/lib/analytics/dashboard-analytics";
import { getDashboardUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const executiveExportActions = [
  { id: "goals", label: "Goals", href: "/api/exports/goals" },
  {
    id: "quarterly-updates",
    label: "Quarterly updates",
    href: "/api/exports/quarterly-updates",
  },
  {
    id: "audit-logs",
    label: "Audit logs",
    href: "/api/exports/audit-logs",
  },
] as const;

const recentActivityActions = [
  "GOAL_APPROVED",
  "GOAL_REJECTED",
  "GOAL_LOCKED",
  "GOAL_UNLOCKED",
  "GOAL_QUARTERLY_UPDATE_CREATED",
  "REVIEW_CYCLE_CREATED",
  "REVIEW_CYCLE_ACTIVATED",
  "REVIEW_CYCLE_DEACTIVATED",
] as const;

const auditLogSelect = {
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
      role: true,
    },
  },
} as const satisfies Prisma.AuditLogSelect;

type AuditLogRecord = Prisma.AuditLogGetPayload<{
  select: typeof auditLogSelect;
}>;

type ExecutiveMetric = {
  description: string;
  icon: LucideIcon;
  label: string;
  tone: string;
  value: number | string;
};

type SnapshotItem = {
  description: string;
  icon: LucideIcon;
  label: string;
  tone: string;
  value: number | string;
};

type QuickAction = {
  description: string;
  href: string;
  icon: LucideIcon;
  label: string;
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

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

function formatDateTime(
  value: Date | string,
) {
  const parsedDate =
    value instanceof Date
      ? value
      : new Date(value);

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

function formatAction(action: string) {
  return action
    .split("_")
    .map(
      (part) =>
        part.charAt(0) +
        part.slice(1).toLowerCase(),
    )
    .join(" ");
}

function formatActor(log: AuditLogRecord) {
  if (!log.actor) {
    return "System";
  }

  return (
    `${log.actor.firstName} ${log.actor.lastName}`.trim() ||
    log.actor.email
  );
}

function getMetadataValue(
  metadata: Prisma.JsonValue | null,
  keys: string[],
) {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return null;
  }

  const metadataRecord =
    metadata as Record<
      string,
      Prisma.JsonValue
    >;

  for (const key of keys) {
    const value = metadataRecord[key];

    if (
      value !== null &&
      value !== undefined &&
      typeof value !== "object"
    ) {
      return String(value);
    }
  }

  return null;
}

function getActivitySubject(
  log: AuditLogRecord,
) {
  return (
    getMetadataValue(log.metadata, [
      "goalTitle",
      "title",
      "name",
      "reviewCycle",
      "parentGoalTitle",
    ]) ??
    `${log.entityType} ${log.entityId.slice(
      0,
      8,
    )}`
  );
}

function getStatusCount(
  statusDistribution: Array<{
    count: number;
    status: GoalStatus;
  }>,
  status: GoalStatus,
) {
  return (
    statusDistribution.find(
      (item) => item.status === status,
    )?.count ?? 0
  );
}

function buildExecutiveKpis(input: {
  activeEmployeeCount: number;
  approvalRate: number;
  approvedGoals: number;
  completionPercentage: number;
  overdueGoals: number;
  overduePercentage: number;
  reviewedGoals: number;
  totalGoals: number;
}): ExecutiveMetric[] {
  return [
    {
      label: "Total goals",
      value: input.totalGoals,
      description:
        "Active-cycle objectives across the enterprise.",
      icon: Target,
      tone:
        "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900",
    },

    {
      label: "Approval rate",
      value: `${input.approvalRate}%`,
      description: `${input.approvedGoals} of ${input.reviewedGoals} reviewed goals approved.`,
      icon: ClipboardCheck,
      tone:
        "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900",
    },

    {
      label: "Completion percentage",
      value: `${input.completionPercentage}%`,
      description:
        "Goal completion from quarterly progress signals.",
      icon: CheckCircle2,
      tone:
        "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
    },

    {
      label: "Overdue percentage",
      value: `${input.overduePercentage}%`,
      description: `${input.overdueGoals} goals are past target date.`,
      icon: Activity,
      tone:
        "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
    },

    {
      label: "Active employees",
      value: input.activeEmployeeCount,
      description:
        "Active employee population in the analytics scope.",
      icon: UsersRound,
      tone:
        "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900",
    },
  ];
}

function SnapshotTile({
  item,
}: {
  item: SnapshotItem;
}) {
  const Icon = item.icon;

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {item.label}
          </p>

          <p className="text-2xl font-semibold tracking-tight">
            {item.value}
          </p>
        </div>

        <div
          className={cn(
            "rounded-lg p-2 ring-1",
            item.tone,
          )}
        >
          <Icon
            className="size-4"
            aria-hidden="true"
          />
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {item.description}
      </p>
    </div>
  );
}

function QuickActionCard({
  action,
}: {
  action: QuickAction;
}) {
  const Icon = action.icon;

  return (
    <Link
      href={action.href}
      className="group rounded-lg border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-lg bg-muted p-2 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
          <Icon
            className="size-4"
            aria-hidden="true"
          />
        </div>
      </div>

      <p className="mt-4 font-medium text-foreground">
        {action.label}
      </p>

      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {action.description}
      </p>
    </Link>
  );
}

export default async function AdminPage() {
  const user = await getDashboardUser();

  if (!user || user.role !== "ADMIN") {
    return (
      <DashboardAuthState
        title="Admin workspace unavailable"
        description="Your current session does not have access to the admin workspace."
        requiredRole="ADMIN"
        userRole={user?.role}
      />
    );
  }

  const [
    analytics,
    recentActivity,
    totalAuditLogCount,
    governanceActivityCount,
  ] = await Promise.all([
    getAdminAnalytics(),

    prisma.auditLog.findMany({
      where: {
        action: {
          in: [...recentActivityActions],
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 8,

      select: auditLogSelect,
    }),

    prisma.auditLog.count(),

    prisma.auditLog.count({
      where: {
        action: {
          in: [...recentActivityActions],
        },
      },
    }),
  ]);

  const completionSummary =
    analytics.completionMonitoring.summary;

  const lockedGoals = getStatusCount(
    [...analytics.statusDistribution].map(
      (item) => ({
        status: item.status as GoalStatus,
        count: item.count,
      }),
    ),
    GoalStatus.LOCKED,
  );

  const executiveKpis =
    buildExecutiveKpis({
      activeEmployeeCount:
        analytics.activeEmployeeCount,

      approvalRate:
        analytics.approvalRate,

      approvedGoals:
        analytics.approvedGoals,

      completionPercentage:
        analytics.completionPercentage,

      overdueGoals:
        analytics.overdueGoals,

      overduePercentage:
        analytics.overduePercentage,

      reviewedGoals:
        analytics.reviewedGoals,

      totalGoals:
        analytics.totalGoals,
    });

  const governanceSnapshot: SnapshotItem[] =
    [
      {
        label: "Active review cycle",
        value: analytics.reviewCycle
          ? `Q${analytics.reviewCycle.quarter} ${analytics.reviewCycle.year}`
          : "None",

        description:
          analytics.reviewCycle?.label ??
          "No active cycle is open.",

        icon: FileClock,

        tone:
          "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900",
      },

      {
        label: "Pending approvals",
        value: analytics.submittedGoals,

        description:
          "Submitted goals awaiting manager review.",

        icon: ClipboardCheck,

        tone:
          "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900",
      },

      {
        label: "Locked goals",
        value: lockedGoals,

        description:
          "Active-cycle goals under governance lock.",

        icon: Lock,

        tone:
          "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
      },

      {
        label: "Governance activity",
        value: governanceActivityCount,

        description:
          "Recorded approvals, locks, cycle changes, and submissions.",

        icon: ShieldCheck,

        tone:
          "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
      },

      {
        label: "Audit visibility",
        value: totalAuditLogCount,

        description:
          "Audit records available for enterprise review.",

        icon: FileText,

        tone:
          "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/70 dark:text-slate-300 dark:ring-slate-800",
      },
    ];

  const completionSnapshot: SnapshotItem[] =
    [
      {
        label: "Completed submissions",

        value:
          completionSummary.completedQuarterlyUpdates,

        description: `${completionSummary.quarterlyCompletionPercentage}% quarterly completion.`,

        icon: CheckCircle2,

        tone:
          "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
      },

      {
        label: "Pending submissions",

        value:
          completionSummary.pendingQuarterlyUpdates,

        description:
          "Approved goals still awaiting current-quarter updates.",

        icon: ListChecks,

        tone:
          "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/70 dark:text-slate-300 dark:ring-slate-800",
      },

      {
        label: "Overdue submissions",

        value:
          completionSummary.overdueQuarterlyUpdates,

        description:
          "Submission obligations past the active-cycle deadline.",

        icon: Activity,

        tone:
          "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
      },

      {
        label: "Awaiting reviews",

        value:
          completionSummary.pendingReviews,

        description: `${completionSummary.managerReviewPercentage}% manager review completion.`,

        icon: ShieldCheck,

        tone:
          "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900",
      },
    ];

  const quickActions: QuickAction[] = [
    {
      label: "Analytics",
      description:
        "Open the full enterprise analytics dashboard.",
      href: "/dashboard/admin/analytics",
      icon: BarChart3,
    },

    {
      label: "Review cycles",
      description:
        "Govern active cycle windows and goal locks.",
      href: "/dashboard/admin/review-cycles",
      icon: FileClock,
    },

    {
      label: "Audit logs",
      description:
        "Review workflow and governance history.",
      href: "/dashboard/admin/audit-logs",
      icon: ShieldCheck,
    },

    {
      label: "Employees",
      description:
        "Inspect active employees and organization scope.",
      href: "/dashboard/admin/employees",
      icon: UserRound,
    },
  ];

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Executive operations center"
        gradientClassName="from-sky-500/10 via-emerald-500/5 to-transparent"
        icon={LayoutDashboard}
        summaryClassName="sm:grid-cols-3 lg:grid-cols-1"
        title="AtomQuest goal operations"
        description="Monitor enterprise goal health, approval flow, completion readiness, and governance exposure from one administrator command view."
      >
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Active cycle
                </p>

                <p className="mt-1 font-semibold">
                  {analytics.reviewCycle
                    ?.label ??
                    "No active review cycle"}
                </p>

                {analytics.reviewCycle ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(
                      analytics.reviewCycle
                        .startDate,
                    )}{" "}
                    to{" "}
                    {formatDate(
                      analytics.reviewCycle
                        .endDate,
                    )}
                  </p>
                ) : null}
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Governance visibility
                </p>

                <p className="mt-1 font-semibold">
                  {
                    analytics.submittedGoals
                  }{" "}
                  pending approvals
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {lockedGoals} locked goals,{" "}
                  {totalAuditLogCount} audit
                  records
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Completion snapshot
                </p>

                <p className="mt-1 font-semibold">
                  {
                    completionSummary.quarterlyCompletionPercentage
                  }
                  % submitted
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {
                    completionSummary.pendingReviews
                  }{" "}
                  reviews awaiting decision
                </p>
              </div>
      </DashboardHero>

      <DashboardMetricGrid
        ariaLabel="Executive KPI summary"
        className="xl:grid-cols-5"
      >
        {executiveKpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            description={kpi.description}
            icon={kpi.icon}
            tone={kpi.tone}
          />
        ))}
      </DashboardMetricGrid>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr] lg:gap-6">
        <Card className="h-full rounded-lg">
          <CardHeader className="border-b">
            <CardTitle>
              Governance snapshot
            </CardTitle>

            <CardDescription>
              Active-cycle controls,
              pending approval exposure,
              and audit coverage.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {governanceSnapshot.map(
                (item) => (
                  <SnapshotTile
                    item={item}
                    key={item.label}
                  />
                ),
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:gap-6">
          <Card className="rounded-lg">
            <CardHeader className="border-b">
              <CardTitle>
                Completion visibility
              </CardTitle>

              <CardDescription>
                Current-quarter submission
                and review health from
                completion monitoring.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {completionSnapshot.map(
                  (item) => (
                    <SnapshotTile
                      item={item}
                      key={item.label}
                    />
                  ),
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader className="border-b">
              <CardTitle>
                Quick actions
              </CardTitle>

              <CardDescription>
                Navigate to the operating
                surfaces administrators use
                most.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {quickActions.map(
                  (action) => (
                    <QuickActionCard
                      action={action}
                      key={action.label}
                    />
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-lg">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>
                Recent activity
              </CardTitle>

              <CardDescription>
                Lightweight governance
                feed for approvals, cycle
                changes, goal locks, and
                quarterly submissions.
              </CardDescription>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
            >
              <Link href="/dashboard/admin/audit-logs">
                <FileText
                  className="size-3.5"
                  aria-hidden="true"
                />

                Audit logs
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {recentActivity.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No recent governance
              activity has been recorded
              yet.
            </div>
          ) : (
            <div className="divide-y">
              {recentActivity.map((log) => (
                <div
                  className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
                  key={log.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {formatAction(
                          log.action,
                        )}
                      </p>

                      <span className="rounded-md border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {log.entityType}
                      </span>
                    </div>

                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {getActivitySubject(
                        log,
                      )}
                    </p>
                  </div>

                  <div className="text-left text-xs text-muted-foreground sm:text-right">
                    <p>
                      {formatDateTime(
                        log.createdAt,
                      )}
                    </p>

                    <p className="mt-1">
                      {formatActor(log)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <section id="executive-exports">
        <ExportActions
          actions={[
            ...executiveExportActions,
          ]}
          description="Organization-wide CSV/XLSX reporting for goals, quarterly updates, and audit logs."
          title="Executive report exports"
        />
      </section>
    </DashboardPage>
  );
}
