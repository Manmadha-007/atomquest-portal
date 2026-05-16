import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  GitBranch,
  ShieldAlert,
} from "lucide-react";

import { KpiCard } from "@/components/analytics/kpi-card";

export type TeamProgressOverviewMetrics = {
  teamCompletionPercentage: number;
  overdueGoals: number;
  pendingQuarterlyUpdates: number;
  averageProgress: number;
  sharedGoalsCount: number;
  atRiskGoals: number;
};

type TeamProgressOverviewProps = {
  metrics: TeamProgressOverviewMetrics;
};

const overviewItems = [
  {
    key: "teamCompletionPercentage",
    label: "Team completion",
    description: "Active-cycle goal completion across direct reports.",
    icon: CheckCircle2,
    suffix: "%",
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
  },
  {
    key: "overdueGoals",
    label: "Overdue goals",
    description: "Incomplete goals past their target date.",
    icon: AlertTriangle,
    tone: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
  },
  {
    key: "pendingQuarterlyUpdates",
    label: "Pending updates",
    description: "Approved goals awaiting quarterly submissions.",
    icon: Clock3,
    tone: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-800",
  },
  {
    key: "averageProgress",
    label: "Average progress",
    description: "Mean execution progress from latest goal signals.",
    icon: Activity,
    suffix: "%",
    tone: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900",
  },
  {
    key: "sharedGoalsCount",
    label: "Shared goals",
    description: "Propagated KPIs in the direct-report portfolio.",
    icon: GitBranch,
    tone: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900",
  },
  {
    key: "atRiskGoals",
    label: "At-risk goals",
    description: "Goals with overdue, stale, or low-momentum signals.",
    icon: ShieldAlert,
    tone: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900",
  },
] as const;

export function TeamProgressOverview({ metrics }: TeamProgressOverviewProps) {
  return (
    <section
      aria-label="Team progress overview"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6"
    >
      {overviewItems.map((item) => (
        <KpiCard
          key={item.key}
          label={item.label}
          value={`${metrics[item.key]}${"suffix" in item ? item.suffix : ""}`}
          description={item.description}
          icon={item.icon}
          tone={item.tone}
        />
      ))}
    </section>
  );
}
