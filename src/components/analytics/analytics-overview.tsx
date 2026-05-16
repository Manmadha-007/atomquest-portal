import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Target,
  UsersRound,
} from "lucide-react";

import { KpiCard } from "@/components/analytics/kpi-card";
import { ProgressTrendChart } from "@/components/analytics/progress-trend-chart";
import { StatusDistributionChart } from "@/components/analytics/status-distribution-chart";
import { TeamPerformanceChart } from "@/components/analytics/team-performance-chart";
import type {
  AnalyticsScope,
  DashboardAnalytics,
} from "@/lib/analytics/dashboard-analytics";

type AnalyticsOverviewProps = {
  analytics: DashboardAnalytics;
  scope: AnalyticsScope;
};

function getKpis(analytics: DashboardAnalytics, scope: AnalyticsScope) {
  if (scope === "manager") {
    return [
      {
        label: "Direct-report completion",
        value: `${analytics.completionPercentage}%`,
        description: `${analytics.totalGoals} active goals across direct reports.`,
        icon: CheckCircle2,
        tone: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
      },
      {
        label: "Approval queue",
        value: analytics.submittedGoals,
        description: "Submitted goals awaiting manager decision.",
        icon: ClipboardCheck,
        tone: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900",
      },
      {
        label: "Team progress average",
        value: `${analytics.averageProgress}%`,
        description: "Mean progress from latest goal update values.",
        icon: Activity,
        tone: "bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:ring-cyan-900",
      },
      {
        label: "Overdue goals",
        value: analytics.overdueGoals,
        description: `${analytics.overduePercentage}% of active team goals are overdue.`,
        icon: AlertTriangle,
        tone: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
      },
      {
        label: "Direct reports",
        value: analytics.activeEmployeeCount,
        description: "Active employees in the manager hierarchy.",
        icon: UsersRound,
        tone: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900",
      },
    ];
  }

  return [
    {
      label: "Total goals",
      value: analytics.totalGoals,
      description: "Active review cycle objectives across the enterprise.",
      icon: Target,
      tone: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900",
    },
    {
      label: "Approval rate",
      value: `${analytics.approvalRate}%`,
      description: `${analytics.approvedGoals} of ${analytics.reviewedGoals} reviewed goals approved.`,
      icon: ClipboardCheck,
      tone: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900",
    },
    {
      label: "Completion percentage",
      value: `${analytics.completionPercentage}%`,
      description: "Goals completed through progress or quarterly status.",
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
    },
    {
      label: "Overdue percentage",
      value: `${analytics.overduePercentage}%`,
      description: `${analytics.overdueGoals} active goals are past target date.`,
      icon: AlertTriangle,
      tone: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
    },
    {
      label: "Active employees",
      value: analytics.activeEmployeeCount,
      description: "Active employee population included in analytics.",
      icon: UsersRound,
      tone: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900",
    },
  ];
}

export function AnalyticsOverview({
  analytics,
  scope,
}: AnalyticsOverviewProps) {
  const kpis = getKpis(analytics, scope);

  return (
    <div className="grid gap-6">
      <section
        aria-label="Analytics KPI summary"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            description={kpi.description}
            icon={kpi.icon}
            tone={kpi.tone}
          />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <StatusDistributionChart data={analytics.statusDistribution} />
        <ProgressTrendChart data={analytics.progressTrend} />
      </div>

      <TeamPerformanceChart data={analytics.teamPerformance} scope={scope} />
    </div>
  );
}
