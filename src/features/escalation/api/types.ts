import type { UserRole } from "@prisma/client";

import type { AppRole } from "@/lib/auth";

export type GovernanceApiRole = AppRole | UserRole;

export type GovernanceApiSession = {
  user?: {
    id?: string | null;
    role?: GovernanceApiRole | string | null;
  } | null;
} | null;

export type GovernanceApiActor = Readonly<{
  id: string;
  role: GovernanceApiRole;
}>;

export type GovernanceApiErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "AUTHORIZATION_REQUIRED"
  | "ESCALATION_NOT_FOUND"
  | "INVALID_REQUEST"
  | "LIFECYCLE_VALIDATION_FAILED"
  | "OPERATION_FAILED";

export type GovernanceApiErrorBody = Readonly<{
  error: {
    code: GovernanceApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}>;

export type GovernanceApiResult<T> = Readonly<{
  data: T;
}>;
