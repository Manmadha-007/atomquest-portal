import { GoalStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  [GoalStatus.DRAFT]: {
    label: "Draft",
    className:
      "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300",
  },
  [GoalStatus.SUBMITTED]: {
    label: "Submitted",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300",
  },
  [GoalStatus.APPROVED]: {
    label: "Approved",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  [GoalStatus.REJECTED]: {
    label: "Rejected",
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300",
  },
  [GoalStatus.LOCKED]: {
    label: "Locked",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  },
} as const satisfies Record<GoalStatus, { label: string; className: string }>;

type EmployeeGoalStatusBadgeProps = {
  status: GoalStatus;
  className?: string;
};

export function formatGoalStatus(status: GoalStatus) {
  return statusConfig[status].label;
}

export function EmployeeGoalStatusBadge({
  status,
  className,
}: EmployeeGoalStatusBadgeProps) {
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
