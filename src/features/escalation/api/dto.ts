import type {
  EscalationLevel,
  EscalationStatus,
  EscalationType,
  Prisma,
  UserRole,
} from "@prisma/client";

import type { EscalationCycleRunResult } from "@/features/escalation/invocation/types";
import type { EscalationSchedulerState } from "@/features/escalation/scheduler/types";

export type GovernancePersonDto = Readonly<{
  id: string;
  name: string;
  email: string | null;
  department: string | null;
  role?: UserRole;
}>;

export type EscalationResponseDto = Readonly<{
  id: string;
  escalationRuleId: string;
  escalationRuleName: string | null;
  escalationType: EscalationType;
  escalationLevel: EscalationLevel;
  status: EscalationStatus;
  triggeredAt: string;
  resolvedAt: string | null;
  dismissedAt: string | null;
  employee: GovernancePersonDto;
  manager: GovernancePersonDto | null;
  targetGoal: {
    id: string;
    title: string;
  } | null;
  message: string;
  metadata: unknown;
  resolution: {
    resolvedByUserId: string | null;
    dismissedByUserId: string | null;
    resolutionReason: string | null;
    dismissalReason: string | null;
    resolutionNotes: string | null;
  };
  createdAt: string;
  updatedAt: string;
}>;

export type EscalationListResponseDto = Readonly<{
  escalations: EscalationResponseDto[];
  count: number;
}>;

export type ExecutionSummaryDto = Readonly<{
  executionId: string;
  status: string;
  triggerSource: string;
  triggeredByUserId: string | null;
  startedAt: string;
  completedAt: string;
  summary: EscalationCycleRunResult["summary"];
  errorSummary: string | null;
}>;

export type SchedulerStateDto = Readonly<{
  registered: boolean;
  state: ReturnType<typeof serializeSchedulerState> | null;
}>;

type EscalationApiRecord = {
  id: string;
  escalationRuleId: string;
  escalationRule?: { name?: string | null } | null;
  escalationType: EscalationType;
  escalationLevel: EscalationLevel;
  status: EscalationStatus;
  triggeredAt: Date;
  resolvedAt: Date | null;
  dismissedAt?: Date | null;
  employee: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    department?: string | null;
    role?: UserRole;
  };
  manager?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    department?: string | null;
    role?: UserRole;
  } | null;
  targetGoal?: {
    id: string;
    title: string;
  } | null;
  message: string;
  metadata?: Prisma.JsonValue | null;
  resolvedByUserId?: string | null;
  dismissedByUserId?: string | null;
  resolutionReason?: string | null;
  dismissalReason?: string | null;
  resolutionNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function formatPersonName(person: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  const name = `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();
  return name || person.email || "Unknown user";
}

function serializeApiValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeApiValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serializeApiValue(entry)]),
    );
  }

  return value;
}

function toPersonDto(person: EscalationApiRecord["employee"]): GovernancePersonDto {
  return {
    id: person.id,
    name: formatPersonName(person),
    email: person.email ?? null,
    department: person.department ?? null,
    ...(person.role ? { role: person.role } : {}),
  };
}

export function toEscalationResponseDto(
  escalationLog: EscalationApiRecord,
): EscalationResponseDto {
  return {
    id: escalationLog.id,
    escalationRuleId: escalationLog.escalationRuleId,
    escalationRuleName: escalationLog.escalationRule?.name ?? null,
    escalationType: escalationLog.escalationType,
    escalationLevel: escalationLog.escalationLevel,
    status: escalationLog.status,
    triggeredAt: escalationLog.triggeredAt.toISOString(),
    resolvedAt: escalationLog.resolvedAt?.toISOString() ?? null,
    dismissedAt: escalationLog.dismissedAt?.toISOString() ?? null,
    employee: toPersonDto(escalationLog.employee),
    manager: escalationLog.manager ? toPersonDto(escalationLog.manager) : null,
    targetGoal: escalationLog.targetGoal
      ? {
          id: escalationLog.targetGoal.id,
          title: escalationLog.targetGoal.title,
        }
      : null,
    message: escalationLog.message,
    metadata: serializeApiValue(escalationLog.metadata ?? null),
    resolution: {
      resolvedByUserId: escalationLog.resolvedByUserId ?? null,
      dismissedByUserId: escalationLog.dismissedByUserId ?? null,
      resolutionReason: escalationLog.resolutionReason ?? null,
      dismissalReason: escalationLog.dismissalReason ?? null,
      resolutionNotes: escalationLog.resolutionNotes ?? null,
    },
    createdAt: escalationLog.createdAt.toISOString(),
    updatedAt: escalationLog.updatedAt.toISOString(),
  };
}

export function toEscalationListResponseDto(
  escalationLogs: EscalationApiRecord[],
): EscalationListResponseDto {
  return {
    escalations: escalationLogs.map(toEscalationResponseDto),
    count: escalationLogs.length,
  };
}

export function toExecutionSummaryDto(
  execution: EscalationCycleRunResult,
): ExecutionSummaryDto {
  return {
    executionId: execution.executionId,
    status: execution.status,
    triggerSource: execution.triggerSource,
    triggeredByUserId: execution.triggeredByUserId,
    startedAt: execution.startedAt.toISOString(),
    completedAt: execution.completedAt.toISOString(),
    summary: execution.summary,
    errorSummary: execution.errorSummary ?? null,
  };
}

export function serializeSchedulerState(state: EscalationSchedulerState) {
  return {
    ...state,
    startedAt: state.startedAt?.toISOString() ?? null,
    stoppedAt: state.stoppedAt?.toISOString() ?? null,
    lastRunStartedAt: state.lastRunStartedAt?.toISOString() ?? null,
    lastRunCompletedAt: state.lastRunCompletedAt?.toISOString() ?? null,
    lastSkippedAt: state.lastSkippedAt?.toISOString() ?? null,
  };
}

export function toSchedulerStateDto(input: {
  registered: boolean;
  state: EscalationSchedulerState | null;
}): SchedulerStateDto {
  return {
    registered: input.registered,
    state: input.state ? serializeSchedulerState(input.state) : null,
  };
}

export function toGovernanceAnalyticsDto<T>(metrics: T): T {
  return serializeApiValue(metrics) as T;
}
