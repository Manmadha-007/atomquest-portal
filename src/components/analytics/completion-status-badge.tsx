import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Hourglass,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { CompletionStatus } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

type CompletionStatusBadgeProps = {
  className?: string;
  label?: string;
  status: CompletionStatus;
};

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  pending: {
    icon: Clock3,
    label: "Pending",
    className:
      "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300",
  },
  overdue: {
    icon: AlertTriangle,
    label: "Overdue",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  },
  reviewed: {
    icon: ShieldCheck,
    label: "Reviewed",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300",
  },
  awaiting_review: {
    icon: Hourglass,
    label: "Awaiting review",
    className:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300",
  },
} as const satisfies Record<
  CompletionStatus,
  {
    className: string;
    icon: typeof CheckCircle2;
    label: string;
  }
>;

export function CompletionStatusBadge({
  className,
  label,
  status,
}: CompletionStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 rounded-md px-2 font-medium",
        config.className,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {label ?? config.label}
    </Badge>
  );
}
