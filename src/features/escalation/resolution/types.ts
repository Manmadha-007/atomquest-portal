import { EscalationStatus } from "@prisma/client";

export type EscalationClosureAction = "RESOLVED" | "DISMISSED";

export type EscalationResolutionErrorCode =
  | "ACTOR_REQUIRED"
  | "ESCALATION_NOT_FOUND"
  | "ESCALATION_NOT_OPEN"
  | "REASON_REQUIRED";

export type ResolveEscalationInput = Readonly<{
  escalationLogId: string;
  resolvedByUserId: string;
  resolutionReason: string;
  resolutionNotes?: string | null;
  resolvedAt?: Date;
}>;

export type DismissEscalationInput = Readonly<{
  escalationLogId: string;
  dismissedByUserId: string;
  dismissalReason: string;
  resolutionNotes?: string | null;
  dismissedAt?: Date;
}>;

export type EscalationResolutionResult = Readonly<{
  escalationLogId: string;
  action: EscalationClosureAction;
  previousStatus: typeof EscalationStatus.OPEN;
  status: typeof EscalationStatus.RESOLVED | typeof EscalationStatus.DISMISSED;
  resolvedAt: Date | null;
  dismissedAt: Date | null;
  resolvedByUserId: string | null;
  dismissedByUserId: string | null;
  reason: string;
  notes: string | null;
}>;
