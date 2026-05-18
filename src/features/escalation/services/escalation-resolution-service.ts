import { EscalationStatus, Prisma } from "@prisma/client";

import type {
  DismissEscalationInput,
  EscalationResolutionErrorCode,
  EscalationResolutionResult,
  ResolveEscalationInput,
} from "@/features/escalation/resolution/types";
import type { EscalationDbClient } from "@/features/escalation/types";

const escalationLifecycleSelect = {
  id: true,
  status: true,
} as const satisfies Prisma.EscalationLogSelect;

const escalationClosureResultSelect = {
  id: true,
  status: true,
  resolvedAt: true,
  resolvedByUserId: true,
  dismissedAt: true,
  dismissedByUserId: true,
  resolutionReason: true,
  dismissalReason: true,
  resolutionNotes: true,
} as const satisfies Prisma.EscalationLogSelect;

export class EscalationResolutionError extends Error {
  readonly code: EscalationResolutionErrorCode;
  readonly escalationLogId?: string;
  readonly currentStatus?: EscalationStatus;

  constructor(input: {
    code: EscalationResolutionErrorCode;
    message: string;
    escalationLogId?: string;
    currentStatus?: EscalationStatus;
  }) {
    super(input.message);
    this.name = "EscalationResolutionError";
    this.code = input.code;
    this.escalationLogId = input.escalationLogId;
    this.currentStatus = input.currentStatus;
  }
}

function normalizeRequiredText(input: {
  value: string;
  code: EscalationResolutionErrorCode;
  label: string;
}) {
  const normalized = input.value.trim();

  if (normalized.length === 0) {
    throw new EscalationResolutionError({
      code: input.code,
      message: `${input.label} is required for escalation closure.`,
    });
  }

  return normalized;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

async function loadOpenEscalationForClosure(input: {
  db: EscalationDbClient;
  escalationLogId: string;
}) {
  const escalationLog = await input.db.escalationLog.findUnique({
    where: { id: input.escalationLogId },
    select: escalationLifecycleSelect,
  });

  if (!escalationLog) {
    throw new EscalationResolutionError({
      code: "ESCALATION_NOT_FOUND",
      message: `Escalation log was not found: ${input.escalationLogId}`,
      escalationLogId: input.escalationLogId,
    });
  }

  if (escalationLog.status !== EscalationStatus.OPEN) {
    throw new EscalationResolutionError({
      code: "ESCALATION_NOT_OPEN",
      message: `Only OPEN escalations may be closed. Current status is ${escalationLog.status}.`,
      escalationLogId: escalationLog.id,
      currentStatus: escalationLog.status,
    });
  }

  return escalationLog;
}

function toResolutionResult(input: {
  escalationLog: Prisma.EscalationLogGetPayload<{
    select: typeof escalationClosureResultSelect;
  }>;
  action: "RESOLVED" | "DISMISSED";
  reason: string;
}): EscalationResolutionResult {
  return {
    escalationLogId: input.escalationLog.id,
    action: input.action,
    previousStatus: EscalationStatus.OPEN,
    status:
      input.action === "RESOLVED"
        ? EscalationStatus.RESOLVED
        : EscalationStatus.DISMISSED,
    resolvedAt: input.escalationLog.resolvedAt,
    dismissedAt: input.escalationLog.dismissedAt,
    resolvedByUserId: input.escalationLog.resolvedByUserId,
    dismissedByUserId: input.escalationLog.dismissedByUserId,
    reason: input.reason,
    notes: input.escalationLog.resolutionNotes,
  };
}

export async function resolveEscalationWithClient(input: {
  db: EscalationDbClient;
} & ResolveEscalationInput): Promise<EscalationResolutionResult> {
  const resolvedByUserId = normalizeRequiredText({
    value: input.resolvedByUserId,
    code: "ACTOR_REQUIRED",
    label: "resolvedByUserId",
  });
  const resolutionReason = normalizeRequiredText({
    value: input.resolutionReason,
    code: "REASON_REQUIRED",
    label: "resolutionReason",
  });
  const resolutionNotes = normalizeOptionalText(input.resolutionNotes);
  const resolvedAt = input.resolvedAt ?? new Date();

  await loadOpenEscalationForClosure({
    db: input.db,
    escalationLogId: input.escalationLogId,
  });

  const escalationLog = await input.db.escalationLog.update({
    where: { id: input.escalationLogId },
    data: {
      status: EscalationStatus.RESOLVED,
      resolvedAt,
      resolvedByUserId,
      resolutionReason,
      resolutionNotes,
    },
    select: escalationClosureResultSelect,
  });

  return toResolutionResult({
    escalationLog,
    action: "RESOLVED",
    reason: resolutionReason,
  });
}

export async function dismissEscalationWithClient(input: {
  db: EscalationDbClient;
} & DismissEscalationInput): Promise<EscalationResolutionResult> {
  const dismissedByUserId = normalizeRequiredText({
    value: input.dismissedByUserId,
    code: "ACTOR_REQUIRED",
    label: "dismissedByUserId",
  });
  const dismissalReason = normalizeRequiredText({
    value: input.dismissalReason,
    code: "REASON_REQUIRED",
    label: "dismissalReason",
  });
  const resolutionNotes = normalizeOptionalText(input.resolutionNotes);
  const dismissedAt = input.dismissedAt ?? new Date();

  await loadOpenEscalationForClosure({
    db: input.db,
    escalationLogId: input.escalationLogId,
  });

  const escalationLog = await input.db.escalationLog.update({
    where: { id: input.escalationLogId },
    data: {
      status: EscalationStatus.DISMISSED,
      dismissedAt,
      dismissedByUserId,
      dismissalReason,
      resolutionNotes,
    },
    select: escalationClosureResultSelect,
  });

  return toResolutionResult({
    escalationLog,
    action: "DISMISSED",
    reason: dismissalReason,
  });
}

export async function resolveEscalation(
  input: ResolveEscalationInput,
): Promise<EscalationResolutionResult> {
  const { prisma } = await import("@/lib/prisma");

  return prisma.$transaction(
    (tx) =>
      resolveEscalationWithClient({
        db: tx,
        ...input,
      }),
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function dismissEscalation(
  input: DismissEscalationInput,
): Promise<EscalationResolutionResult> {
  const { prisma } = await import("@/lib/prisma");

  return prisma.$transaction(
    (tx) =>
      dismissEscalationWithClient({
        db: tx,
        ...input,
      }),
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}
