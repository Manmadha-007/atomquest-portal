import {
  EscalationStatus,
  EscalationTriggerSource,
  Prisma,
  UserRole,
} from "@prisma/client";

import {
  createGovernanceJsonResponse,
  GovernanceApiError,
  requireGovernanceActor,
  withGovernanceApiErrors,
} from "@/features/escalation/api/errors";
import {
  toEscalationListResponseDto,
  toEscalationResponseDto,
  toExecutionSummaryDto,
  toGovernanceAnalyticsDto,
  toSchedulerStateDto,
} from "@/features/escalation/api/dto";
import type {
  GovernanceApiRole,
  GovernanceApiSession,
} from "@/features/escalation/api/types";
import type { GovernanceSchedulerControls } from "@/features/escalation/api/scheduler-control";
import { governanceSchedulerControls } from "@/features/escalation/api/scheduler-control";
import type {
  GovernanceAnalyticsServiceInput,
  GovernanceAnalyticsTimeWindow,
} from "@/features/escalation/analytics/types";
import type {
  EscalationCycleRunInput,
  EscalationCycleRunResult,
} from "@/features/escalation/invocation/types";
import type {
  DismissEscalationInput,
  EscalationResolutionResult,
  ResolveEscalationInput,
} from "@/features/escalation/resolution/types";
import {
  getEscalationLifecycleMetricsWithClient,
  getEscalationOverviewMetricsWithClient,
  getExecutionHealthMetricsWithClient,
  getGovernanceAccountabilityMetricsWithClient,
} from "@/features/escalation/services/escalation-analytics-service";
import { runEscalationCycle } from "@/features/escalation/services/escalation-cycle-service";
import {
  dismissEscalation,
  EscalationResolutionError,
  resolveEscalation,
} from "@/features/escalation/services/escalation-resolution-service";
import type { EscalationDbClient } from "@/features/escalation/types";

const ADMIN_ONLY = [UserRole.ADMIN] satisfies GovernanceApiRole[];
const ADMIN_OR_MANAGER = [
  UserRole.ADMIN,
  UserRole.MANAGER,
] satisfies GovernanceApiRole[];

const escalationApiSelect = {
  id: true,
  escalationRuleId: true,
  escalationRule: {
    select: {
      name: true,
    },
  },
  escalationType: true,
  escalationLevel: true,
  status: true,
  triggeredAt: true,
  resolvedAt: true,
  resolvedByUserId: true,
  dismissedAt: true,
  dismissedByUserId: true,
  resolutionReason: true,
  dismissalReason: true,
  resolutionNotes: true,
  employee: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      department: true,
      role: true,
    },
  },
  managerId: true,
  manager: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      department: true,
      role: true,
    },
  },
  targetGoal: {
    select: {
      id: true,
      title: true,
    },
  },
  message: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.EscalationLogSelect;

type EscalationApiRecord = Prisma.EscalationLogGetPayload<{
  select: typeof escalationApiSelect;
}>;

type AnalyticsKind = "overview" | "lifecycle" | "execution-health" | "accountability";

type ResolutionService = (
  input: ResolveEscalationInput,
) => Promise<EscalationResolutionResult>;

type DismissalService = (
  input: DismissEscalationInput,
) => Promise<EscalationResolutionResult>;

type EscalationCycleRunner = (
  input: EscalationCycleRunInput,
) => Promise<EscalationCycleRunResult>;

function urlSearchParams(request: Request) {
  return new URL(request.url).searchParams;
}

function parseEscalationStatus(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();

  if (
    normalized === EscalationStatus.OPEN ||
    normalized === EscalationStatus.RESOLVED ||
    normalized === EscalationStatus.DISMISSED
  ) {
    return normalized;
  }

  throw new GovernanceApiError({
    code: "INVALID_REQUEST",
    message: "Escalation status filter must be OPEN, RESOLVED, or DISMISSED.",
    status: 400,
  });
}

function parseIntegerParam(input: {
  searchParams: URLSearchParams;
  name: string;
  min: number;
  max: number;
}) {
  const rawValue = input.searchParams.get(input.name);

  if (!rawValue) {
    return undefined;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < input.min ||
    parsedValue > input.max
  ) {
    throw new GovernanceApiError({
      code: "INVALID_REQUEST",
      message: `${input.name} must be an integer between ${input.min} and ${input.max}.`,
      status: 400,
    });
  }

  return parsedValue;
}

function parseOptionalDate(value: string | null, label: string) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new GovernanceApiError({
      code: "INVALID_REQUEST",
      message: `${label} must be a valid ISO date.`,
      status: 400,
    });
  }

  return parsedDate;
}

function parseAnalyticsTimeWindow(
  searchParams: URLSearchParams,
): GovernanceAnalyticsTimeWindow | undefined {
  const rawPreset = searchParams.get("window") ?? searchParams.get("preset");

  if (!rawPreset) {
    return undefined;
  }

  const preset = rawPreset.trim().toUpperCase().replace(/-/g, "_");

  switch (preset) {
    case "ALL_TIME":
      return { preset: "ALL_TIME" };
    case "LAST_7_DAYS":
      return { preset: "LAST_7_DAYS" };
    case "LAST_30_DAYS":
      return { preset: "LAST_30_DAYS" };
    case "CURRENT_REVIEW_CYCLE":
      return { preset: "CURRENT_REVIEW_CYCLE" };
    case "CUSTOM":
      return {
        preset: "CUSTOM",
        from: parseOptionalDate(searchParams.get("from"), "from"),
        to: parseOptionalDate(searchParams.get("to"), "to"),
        label: searchParams.get("label") ?? undefined,
      };
    default:
      throw new GovernanceApiError({
        code: "INVALID_REQUEST",
        message:
          "Analytics window must be ALL_TIME, LAST_7_DAYS, LAST_30_DAYS, CURRENT_REVIEW_CYCLE, or CUSTOM.",
        status: 400,
      });
  }
}

async function readJsonObject(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new GovernanceApiError({
      code: "INVALID_REQUEST",
      message: "Request body must be valid JSON.",
      status: 400,
    });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new GovernanceApiError({
      code: "INVALID_REQUEST",
      message: "Request body must be a JSON object.",
      status: 400,
    });
  }

  return body as Record<string, unknown>;
}

function readRequiredText(input: {
  body: Record<string, unknown>;
  field: string;
  maxLength: number;
}) {
  const value = input.body[input.field];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new GovernanceApiError({
      code: "INVALID_REQUEST",
      message: `${input.field} is required.`,
      status: 400,
    });
  }

  const normalized = value.trim();

  if (normalized.length > input.maxLength) {
    throw new GovernanceApiError({
      code: "INVALID_REQUEST",
      message: `${input.field} must be ${input.maxLength} characters or fewer.`,
      status: 400,
    });
  }

  return normalized;
}

function readOptionalText(input: {
  body: Record<string, unknown>;
  field: string;
  maxLength: number;
}) {
  const value = input.body[input.field];

  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new GovernanceApiError({
      code: "INVALID_REQUEST",
      message: `${input.field} must be text when provided.`,
      status: 400,
    });
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length > input.maxLength) {
    throw new GovernanceApiError({
      code: "INVALID_REQUEST",
      message: `${input.field} must be ${input.maxLength} characters or fewer.`,
      status: 400,
    });
  }

  return normalized;
}

function readOptionalBoolean(input: {
  body: Record<string, unknown>;
  field: string;
}) {
  const value = input.body[input.field];

  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value !== "boolean") {
    throw new GovernanceApiError({
      code: "INVALID_REQUEST",
      message: `${input.field} must be a boolean when provided.`,
      status: 400,
    });
  }

  return value;
}

function assertEscalationId(escalationLogId: string) {
  if (!escalationLogId.trim()) {
    throw new GovernanceApiError({
      code: "INVALID_REQUEST",
      message: "Escalation id is required.",
      status: 400,
    });
  }
}

function assertManagerCanAccessEscalation(input: {
  actorRole: GovernanceApiRole;
  actorId: string;
  escalationLog: Pick<EscalationApiRecord, "managerId">;
}) {
  if (
    input.actorRole === UserRole.MANAGER &&
    input.escalationLog.managerId !== input.actorId
  ) {
    throw new GovernanceApiError({
      code: "AUTHORIZATION_REQUIRED",
      message: "Managers may only access escalations assigned to them.",
      status: 403,
    });
  }
}

function toLifecycleValidationError(error: EscalationResolutionError) {
  return new GovernanceApiError({
    code: "LIFECYCLE_VALIDATION_FAILED",
    message: error.message,
    status: error.code === "ESCALATION_NOT_FOUND" ? 404 : 409,
    details: {
      escalationLogId: error.escalationLogId,
      currentStatus: error.currentStatus,
      resolutionCode: error.code,
    },
  });
}

async function loadEscalationForAccess(input: {
  db: EscalationDbClient;
  escalationLogId: string;
}) {
  const escalationLog = await input.db.escalationLog.findUnique({
    where: { id: input.escalationLogId },
    select: escalationApiSelect,
  });

  if (!escalationLog) {
    throw new GovernanceApiError({
      code: "ESCALATION_NOT_FOUND",
      message: "Escalation was not found.",
      status: 404,
    });
  }

  return escalationLog;
}

export async function handleListEscalations(input: {
  request: Request;
  session: GovernanceApiSession;
  db: EscalationDbClient;
}): Promise<Response> {
  return withGovernanceApiErrors(async () => {
    const actor = requireGovernanceActor({
      session: input.session,
      allowedRoles: ADMIN_OR_MANAGER,
    });
    const status = parseEscalationStatus(
      urlSearchParams(input.request).get("status"),
    );
    const where: Prisma.EscalationLogWhereInput = {
      ...(status ? { status } : {}),
      ...(actor.role === UserRole.MANAGER ? { managerId: actor.id } : {}),
    };
    const escalationLogs = await input.db.escalationLog.findMany({
      where,
      orderBy: [{ triggeredAt: "desc" }, { id: "asc" }],
      select: escalationApiSelect,
    });

    return createGovernanceJsonResponse(
      toEscalationListResponseDto(escalationLogs),
    );
  });
}

export async function handleGetEscalation(input: {
  session: GovernanceApiSession;
  db: EscalationDbClient;
  escalationLogId: string;
}): Promise<Response> {
  return withGovernanceApiErrors(async () => {
    assertEscalationId(input.escalationLogId);
    const actor = requireGovernanceActor({
      session: input.session,
      allowedRoles: ADMIN_OR_MANAGER,
    });
    const escalationLog = await loadEscalationForAccess(input);
    assertManagerCanAccessEscalation({
      actorId: actor.id,
      actorRole: actor.role,
      escalationLog,
    });

    return createGovernanceJsonResponse(toEscalationResponseDto(escalationLog));
  });
}

export async function handleResolveEscalation(input: {
  request: Request;
  session: GovernanceApiSession;
  db: EscalationDbClient;
  escalationLogId: string;
  now?: Date;
  resolveEscalationService?: ResolutionService;
}): Promise<Response> {
  return withGovernanceApiErrors(async () => {
    assertEscalationId(input.escalationLogId);
    const actor = requireGovernanceActor({
      session: input.session,
      allowedRoles: ADMIN_OR_MANAGER,
    });
    const escalationLog = await loadEscalationForAccess(input);
    assertManagerCanAccessEscalation({
      actorId: actor.id,
      actorRole: actor.role,
      escalationLog,
    });

    const body = await readJsonObject(input.request);
    const resolutionReason = readRequiredText({
      body,
      field: "reason",
      maxLength: 500,
    });
    const resolutionNotes = readOptionalText({
      body,
      field: "notes",
      maxLength: 1000,
    });

    try {
      const result = await (input.resolveEscalationService ?? resolveEscalation)({
        escalationLogId: input.escalationLogId,
        resolvedByUserId: actor.id,
        resolutionReason,
        resolutionNotes,
        resolvedAt: input.now,
      });

      return createGovernanceJsonResponse(result);
    } catch (error) {
      if (error instanceof EscalationResolutionError) {
        throw toLifecycleValidationError(error);
      }

      throw error;
    }
  });
}

export async function handleDismissEscalation(input: {
  request: Request;
  session: GovernanceApiSession;
  escalationLogId: string;
  now?: Date;
  dismissEscalationService?: DismissalService;
}): Promise<Response> {
  return withGovernanceApiErrors(async () => {
    assertEscalationId(input.escalationLogId);
    const actor = requireGovernanceActor({
      session: input.session,
      allowedRoles: ADMIN_ONLY,
    });
    const body = await readJsonObject(input.request);
    const dismissalReason = readRequiredText({
      body,
      field: "reason",
      maxLength: 500,
    });
    const resolutionNotes = readOptionalText({
      body,
      field: "notes",
      maxLength: 1000,
    });

    try {
      const result = await (input.dismissEscalationService ?? dismissEscalation)({
        escalationLogId: input.escalationLogId,
        dismissedByUserId: actor.id,
        dismissalReason,
        resolutionNotes,
        dismissedAt: input.now,
      });

      return createGovernanceJsonResponse(result);
    } catch (error) {
      if (error instanceof EscalationResolutionError) {
        throw toLifecycleValidationError(error);
      }

      throw error;
    }
  });
}

export async function handleRunEscalationCycle(input: {
  request: Request;
  session: GovernanceApiSession;
  now?: Date;
  runEscalationCycleService?: EscalationCycleRunner;
}): Promise<Response> {
  return withGovernanceApiErrors(async () => {
    const actor = requireGovernanceActor({
      session: input.session,
      allowedRoles: ADMIN_ONLY,
    });
    const body = await readJsonObject(input.request);
    const dryRun = readOptionalBoolean({ body, field: "dryRun" });
    const execution = await (input.runEscalationCycleService ?? runEscalationCycle)({
      triggerSource: EscalationTriggerSource.API,
      triggeredByUserId: actor.id,
      now: input.now,
      providers: dryRun ? [] : undefined,
      metadata: {
        api: {
          invokedByUserId: actor.id,
          dryRun,
        },
      },
    });

    return createGovernanceJsonResponse(toExecutionSummaryDto(execution));
  });
}

function analyticsInputFromRequest(
  request: Request,
): GovernanceAnalyticsServiceInput & {
  slaWindowDays?: number;
  maxRecentExecutions?: number;
} {
  const searchParams = urlSearchParams(request);

  return {
    timeWindow: parseAnalyticsTimeWindow(searchParams),
    slaWindowDays: parseIntegerParam({
      searchParams,
      name: "slaWindowDays",
      min: 1,
      max: 365,
    }),
    maxRecentExecutions: parseIntegerParam({
      searchParams,
      name: "maxRecentExecutions",
      min: 1,
      max: 100,
    }),
  };
}

export async function handleGovernanceAnalytics(input: {
  request: Request;
  session: GovernanceApiSession;
  db: EscalationDbClient;
  kind: AnalyticsKind;
  now?: Date;
}): Promise<Response> {
  return withGovernanceApiErrors(async () => {
    requireGovernanceActor({
      session: input.session,
      allowedRoles: ADMIN_OR_MANAGER,
    });
    const analyticsInput = analyticsInputFromRequest(input.request);

    switch (input.kind) {
      case "overview":
        return createGovernanceJsonResponse(
          toGovernanceAnalyticsDto(
            await getEscalationOverviewMetricsWithClient({
              db: input.db,
              now: input.now,
              timeWindow: analyticsInput.timeWindow,
            }),
          ),
        );

      case "lifecycle":
        return createGovernanceJsonResponse(
          toGovernanceAnalyticsDto(
            await getEscalationLifecycleMetricsWithClient({
              db: input.db,
              now: input.now,
              timeWindow: analyticsInput.timeWindow,
              slaWindowDays: analyticsInput.slaWindowDays,
            }),
          ),
        );

      case "execution-health":
        return createGovernanceJsonResponse(
          toGovernanceAnalyticsDto(
            await getExecutionHealthMetricsWithClient({
              db: input.db,
              now: input.now,
              timeWindow: analyticsInput.timeWindow,
              maxRecentExecutions: analyticsInput.maxRecentExecutions,
            }),
          ),
        );

      case "accountability":
        return createGovernanceJsonResponse(
          toGovernanceAnalyticsDto(
            await getGovernanceAccountabilityMetricsWithClient({
              db: input.db,
              now: input.now,
              timeWindow: analyticsInput.timeWindow,
            }),
          ),
        );
    }
  });
}

export async function handleSchedulerState(input: {
  session: GovernanceApiSession;
  controls?: GovernanceSchedulerControls;
}): Promise<Response> {
  return withGovernanceApiErrors(async () => {
    requireGovernanceActor({
      session: input.session,
      allowedRoles: ADMIN_ONLY,
    });
    const result = (input.controls ?? governanceSchedulerControls).getState();

    return createGovernanceJsonResponse(toSchedulerStateDto(result));
  });
}

export async function handleSchedulerStart(input: {
  session: GovernanceApiSession;
  controls?: GovernanceSchedulerControls;
}): Promise<Response> {
  return withGovernanceApiErrors(async () => {
    requireGovernanceActor({
      session: input.session,
      allowedRoles: ADMIN_ONLY,
    });
    const result = (input.controls ?? governanceSchedulerControls).start();

    return createGovernanceJsonResponse({
      action: result.action,
      scheduler: toSchedulerStateDto(result),
    });
  });
}

export async function handleSchedulerStop(input: {
  session: GovernanceApiSession;
  controls?: GovernanceSchedulerControls;
}): Promise<Response> {
  return withGovernanceApiErrors(async () => {
    requireGovernanceActor({
      session: input.session,
      allowedRoles: ADMIN_ONLY,
    });
    const result = (input.controls ?? governanceSchedulerControls).stop();

    return createGovernanceJsonResponse({
      action: result.action,
      scheduler: toSchedulerStateDto(result),
    });
  });
}
