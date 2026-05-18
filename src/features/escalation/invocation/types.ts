import type {
  EscalationExecutionStatus,
  EscalationTriggerSource,
  Prisma,
} from "@prisma/client";

import type { NotificationProvider } from "@/lib/notifications/providers/types";

import type { EscalationEvaluationRunResult } from "@/features/escalation/types";
import type { EscalationNotificationRunResult } from "@/features/escalation/notifications/types";

export type EscalationCycleRunInput = Readonly<{
  triggeredByUserId?: string | null;
  triggerSource: EscalationTriggerSource;
  now?: Date;
  providers?: NotificationProvider[];
  metadata?: Prisma.JsonObject;
}>;

export type EscalationCycleSummary = Readonly<{
  rulesEvaluated: number;
  violationsDetected: number;
  logsCreated: number;
  evaluationDuplicates: number;
  notificationsAttempted: number;
  notificationsDelivered: number;
  notificationsSkipped: number;
  notificationDuplicates: number;
  failures: number;
}>;

export type EscalationCycleRunResult = Readonly<{
  executionId: string;
  status: EscalationExecutionStatus;
  triggerSource: EscalationTriggerSource;
  triggeredByUserId: string | null;
  startedAt: Date;
  completedAt: Date;
  summary: EscalationCycleSummary;
  evaluation: EscalationEvaluationRunResult | null;
  notifications: EscalationNotificationRunResult | null;
  errorSummary?: string;
}>;
