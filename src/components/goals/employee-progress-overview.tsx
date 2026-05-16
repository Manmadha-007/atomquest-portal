import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Target,
} from "lucide-react";

import { KpiCard } from "@/components/analytics/kpi-card";

export type EmployeeProgressOverviewMetrics = {
  activeGoals: number;
  completedGoals: number;
  overdueGoals: number;
  averageProgress: number;
  sharedGoalsCount: number;
};

type EmployeeProgressOverviewProps = {
  metrics: EmployeeProgressOverviewMetrics;
};

const overviewItems = [
  {
    key: "activeGoals",
    label: "Active goals",
    description: "Current-cycle goals in execution scope.",
    icon: Target,
    tone: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900",
  },
  {
    key: "completedGoals",
    label: "Completed goals",
    description: "Completed by status or progress signal.",
    icon: CheckCircle2,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
  },
  {
    key: "overdueGoals",
    label: "Overdue goals",
    description: "Past target date and not complete.",
    icon: AlertTriangle,
    tone: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
  },
  {
    key: "averageProgress",
    label: "Average progress",
    description: "Mean progress across active goals.",
    icon: Activity,
    suffix: "%",
    tone: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900",
  },
  {
    key: "sharedGoalsCount",
    label: "Shared goals",
    description: "Linked KPIs with propagated progress.",
    icon: GitBranch,
    tone: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900",
  },
] as const;

export function EmployeeProgressOverview({
  metrics,
}: EmployeeProgressOverviewProps) {
  return (
    <section
      aria-label="Personal progress overview"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
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
