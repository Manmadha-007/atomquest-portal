import type { GovernanceMetricViewModel } from "@/features/escalation/ui/view-models";
import { cn } from "@/lib/utils";

export function GovernanceMetricCard({
  metric,
}: {
  metric: GovernanceMetricViewModel;
}) {
  const Icon = metric.icon;

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {metric.label}
          </p>
          <p className="mt-2 font-heading text-2xl font-semibold leading-none">
            {metric.value}
          </p>
        </div>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1",
            metric.tone,
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-5 text-muted-foreground">
        {metric.description}
      </p>
    </div>
  );
}
