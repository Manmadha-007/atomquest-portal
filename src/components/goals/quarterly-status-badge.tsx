type QuarterlyStatus = "NOT_STARTED" | "ON_TRACK" | "COMPLETED" | "DELAYED";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  ["NOT_STARTED"]: {
    label: "Not started",
    className:
      "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300",
  },
  ["ON_TRACK"]: {
    label: "On track",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300",
  },
  ["COMPLETED"]: {
    label: "Completed",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  ["DELAYED"]: {
    label: "Delayed",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  },
} as const satisfies Record<
  QuarterlyStatus,
  { label: string; className: string }
>;

type QuarterlyStatusBadgeProps = {
  status: QuarterlyStatus;
  className?: string;
};

export function formatQuarterlyStatus(status: QuarterlyStatus) {
  return statusConfig[status].label;
}

export function QuarterlyStatusBadge({
  status,
  className,
}: QuarterlyStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 rounded-md px-2 font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </Badge>
  );
}
