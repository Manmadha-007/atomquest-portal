import {
  EscalationLevel,
  EscalationStatus,
  EscalationType,
} from "@prisma/client";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  FileClock,
  Gauge,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import type {
  GovernanceConsoleData,
  GovernanceConsoleRole,
} from "@/features/escalation/ui/types";

export type GovernanceCapabilitySet = Readonly<{
  canControlScheduler: boolean;
  canDismissEscalations: boolean;
  canResolveEscalations: boolean;
  canRunEscalationCycle: boolean;
}>;

export type GovernanceMetricViewModel = Readonly<{
  id: string;
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone: string;
}>;

export function getGovernanceCapabilities(
  role: GovernanceConsoleRole,
): GovernanceCapabilitySet {
  return {
    canControlScheduler: role === "ADMIN",
    canDismissEscalations: role === "ADMIN",
    canResolveEscalations: role === "ADMIN" || role === "MANAGER",
    canRunEscalationCycle: role === "ADMIN",
  };
}

export function formatGovernanceEnum(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export function formatGovernanceDateTime(value?: string | null) {
  if (!value) {
    return "Not recorded";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

export function formatGovernanceNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "Not available";
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatGovernanceRatio(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "Not available";
  }

  return `${Math.round(value * 100)}%`;
}

export function formatHours(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "Not available";
  }

  if (value < 24) {
    return `${formatGovernanceNumber(value)}h`;
  }

  return `${formatGovernanceNumber(value / 24)}d`;
}

export function getEscalationStatusTone(status: string) {
  switch (status) {
    case EscalationStatus.OPEN:
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
    case EscalationStatus.RESOLVED:
      return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
    case EscalationStatus.DISMISSED:
      return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export function getExecutionStatusTone(status: string) {
  switch (status) {
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "PARTIALLY_COMPLETED":
      return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300";
    case "FAILED":
      return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300";
    case "RUNNING":
      return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export function getEscalationTypeLabel(type: EscalationType) {
  const labels = {
    [EscalationType.GOAL_NOT_SUBMITTED]: "Goal not submitted",
    [EscalationType.APPROVAL_PENDING_TOO_LONG]: "Approval pending",
    [EscalationType.CHECKIN_MISSED]: "Check-in missed",
  } satisfies Record<EscalationType, string>;

  return labels[type];
}

export function getEscalationLevelLabel(level: EscalationLevel) {
  const labels = {
    [EscalationLevel.LEVEL_1]: "Level 1",
    [EscalationLevel.LEVEL_2]: "Level 2",
    [EscalationLevel.LEVEL_3]: "Level 3",
  } satisfies Record<EscalationLevel, string>;

  return labels[level];
}

export function buildGovernanceMetricCards(
  data: GovernanceConsoleData,
): GovernanceMetricViewModel[] {
  return [
    {
      id: "open-escalations",
      label: "Open escalations",
      value: formatGovernanceNumber(data.overview.openEscalations),
      description: `${formatGovernanceNumber(data.lifecycle.meanOpenAgeDays)} day mean open age.`,
      icon: AlertTriangle,
      tone: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
    },
    {
      id: "resolved-escalations",
      label: "Resolved",
      value: formatGovernanceNumber(data.overview.resolvedEscalations),
      description: `${formatGovernanceRatio(data.lifecycle.resolvedWithinSlaRatio)} resolved inside SLA.`,
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
    },
    {
      id: "dismissed-escalations",
      label: "Dismissed",
      value: formatGovernanceNumber(data.overview.dismissedEscalations),
      description: `${formatGovernanceRatio(data.lifecycle.dismissalRatio)} of closed escalations.`,
      icon: XCircle,
      tone: "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-800",
    },
    {
      id: "execution-health",
      label: "Execution success",
      value: formatGovernanceRatio(data.executionHealth.successRatio),
      description: `${formatGovernanceNumber(data.executionHealth.failures)} recorded execution failures.`,
      icon: Gauge,
      tone: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900",
    },
    {
      id: "notification-delivery",
      label: "Notification delivery",
      value: formatGovernanceRatio(
        data.executionHealth.notificationDeliverySuccessRatio,
      ),
      description: `${formatGovernanceNumber(data.executionHealth.notificationsAttempted)} attempted sends.`,
      icon: BellRing,
      tone: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900",
    },
    {
      id: "scheduler-state",
      label: "Scheduler",
      value: data.scheduler.state?.isStarted ? "Running" : "Stopped",
      description: `${formatGovernanceNumber(data.scheduler.state?.skippedOverlapCount ?? 0)} overlap skips recorded.`,
      icon: FileClock,
      tone: data.scheduler.state?.isStarted
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900"
        : "bg-zinc-50 text-zinc-700 ring-zinc-200 dark:bg-zinc-900/60 dark:text-zinc-300 dark:ring-zinc-800",
    },
  ];
}

export function getOldestOpenDescription(data: GovernanceConsoleData) {
  const oldest = data.lifecycle.oldestOpenEscalation;

  if (!oldest) {
    return "No open escalation aging exposure.";
  }

  return `${getEscalationTypeLabel(oldest.escalationType)} has been open for ${oldest.ageDays} days.`;
}

export function getGovernanceConsoleSubtitle(role: GovernanceConsoleRole) {
  return role === "ADMIN"
    ? "Control escalation execution, scheduler posture, lifecycle closure, and governance visibility from one audited operations surface."
    : "Review assigned escalation exposure, lifecycle status, analytics, and accountable follow-up without scheduler or dismissal controls.";
}

export function getGovernanceConsoleEyebrow(role: GovernanceConsoleRole) {
  return role === "ADMIN" ? "Governance operations" : "Manager governance";
}

export function getResolutionIcon(status: string) {
  return status === EscalationStatus.RESOLVED ? ShieldCheck : Clock3;
}
