import { CheckCircle2, Link2, LockKeyhole, Radio, ShieldCheck } from "lucide-react";
import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SharedGoalBadgeKind =
  | "primary"
  | "linked"
  | "synced"
  | "pending"
  | "restricted"
  | "locked";

type SharedGoalBadgeProps = {
  kind: SharedGoalBadgeKind;
  className?: string;
};

const badgeConfig = {
  primary: {
    label: "Primary",
    icon: ShieldCheck,
    className:
      "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300",
  },
  linked: {
    label: "Linked",
    icon: Link2,
    className:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300",
  },
  synced: {
    label: "Synced",
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  pending: {
    label: "Awaiting update",
    icon: Radio,
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  },
  restricted: {
    label: "Weight only",
    icon: LockKeyhole,
    className:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300",
  },
  locked: {
    label: "Primary locked",
    icon: LockKeyhole,
    className:
      "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300",
  },
} as const satisfies Record<
  SharedGoalBadgeKind,
  {
    label: string;
    icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
    className: string;
  }
>;

export function SharedGoalBadge({ kind, className }: SharedGoalBadgeProps) {
  const config = badgeConfig[kind];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn("h-6 rounded-md px-2 font-medium", config.className, className)}
    >
      <Icon className="size-3" aria-hidden="true" />
      {config.label}
    </Badge>
  );
}
