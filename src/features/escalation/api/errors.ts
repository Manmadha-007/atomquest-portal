import { UserRole } from "@prisma/client";

import { isAppRole } from "@/lib/auth";

import type {
  GovernanceApiActor,
  GovernanceApiErrorBody,
  GovernanceApiErrorCode,
  GovernanceApiRole,
  GovernanceApiSession,
} from "@/features/escalation/api/types";

export class GovernanceApiError extends Error {
  readonly code: GovernanceApiErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(input: {
    code: GovernanceApiErrorCode;
    message: string;
    status: number;
    details?: Record<string, unknown>;
  }) {
    super(input.message);
    this.name = "GovernanceApiError";
    this.code = input.code;
    this.status = input.status;
    this.details = input.details;
  }
}

export function createGovernanceErrorResponse(
  error: GovernanceApiError,
): Response {
  const body: GovernanceApiErrorBody = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  };

  return Response.json(body, { status: error.status });
}

export function createGovernanceJsonResponse<T>(
  data: T,
  init?: ResponseInit,
): Response {
  return Response.json({ data }, init);
}

export function isGovernanceApiRole(value: unknown): value is GovernanceApiRole {
  return isAppRole(value) || value === UserRole.ADMIN || value === UserRole.MANAGER || value === UserRole.EMPLOYEE;
}

export function requireGovernanceActor(input: {
  session: GovernanceApiSession;
  allowedRoles: GovernanceApiRole[];
}): GovernanceApiActor {
  const user = input.session?.user;

  if (!user?.id || !isGovernanceApiRole(user.role)) {
    throw new GovernanceApiError({
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication is required for governance operations.",
      status: 401,
    });
  }

  if (!input.allowedRoles.includes(user.role)) {
    throw new GovernanceApiError({
      code: "AUTHORIZATION_REQUIRED",
      message: "You do not have permission to perform this governance operation.",
      status: 403,
    });
  }

  return {
    id: user.id,
    role: user.role,
  };
}

export async function withGovernanceApiErrors(
  operation: () => Promise<Response>,
): Promise<Response> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof GovernanceApiError) {
      return createGovernanceErrorResponse(error);
    }

    console.error("Governance API operation failed", error);

    return createGovernanceErrorResponse(
      new GovernanceApiError({
        code: "OPERATION_FAILED",
        message: "Governance operation could not be completed.",
        status: 500,
      }),
    );
  }
}
