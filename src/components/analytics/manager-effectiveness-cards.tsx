import { Clock, ThumbsUp, Hourglass, CheckSquare } from "lucide-react";
import { KpiCard } from "@/components/analytics/kpi-card";
import { DashboardMetricGrid } from "@/components/layout/dashboard-page";
import type { ManagerEffectivenessMetrics } from "@/lib/analytics/types";

export function ManagerEffectivenessCards({
  metrics,
}: {
  metrics: ManagerEffectivenessMetrics;
}) {
  const turnaroundLabel =
    metrics.averageTurnaroundTimeHours > 24
      ? `${(metrics.averageTurnaroundTimeHours / 24).toFixed(1)} days`
      : `${metrics.averageTurnaroundTimeHours.toFixed(1)} hours`;

  return (
    <DashboardMetricGrid
      ariaLabel="Manager effectiveness summary"
      className="xl:grid-cols-4"
    >
      <KpiCard
        label="Avg turnaround time"
        value={turnaroundLabel}
        description="Average time taken to review submitted goals."
        icon={Clock}
        tone="bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900"
      />
      <KpiCard
        label="Approval ratio"
        value={`${metrics.approvalRatio}%`}
        description="Percentage of reviewed goals that were approved."
        icon={ThumbsUp}
        tone="bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900"
      />
      <KpiCard
        label="Pending approvals"
        value={metrics.pendingApprovals}
        description="Goals currently awaiting a manager decision."
        icon={Hourglass}
        tone="bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900"
      />
      <KpiCard
        label="Total decisions"
        value={metrics.reviewedCount}
        description="Total approval and rejection decisions made."
        icon={CheckSquare}
        tone="bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-950/50 dark:text-slate-300 dark:ring-slate-900"
      />
    </DashboardMetricGrid>
  );
}
