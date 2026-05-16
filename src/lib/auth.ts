import type { UserRole } from "@prisma/client";

export type AppRole = UserRole;

export const SIGN_IN_PATH = "/api/auth/signin";
export const DASHBOARD_ROOT_PATH = "/dashboard";

const roleDashboardPaths = {
  ADMIN: "/dashboard/admin",
  MANAGER: "/dashboard/manager",
  EMPLOYEE: "/dashboard/employee",
} satisfies Record<AppRole, string>;

const protectedDashboardRoutes = [
  { path: "/dashboard/admin", role: "ADMIN" },
  { path: "/dashboard/manager", role: "MANAGER" },
  { path: "/dashboard/employee", role: "EMPLOYEE" },
] as const satisfies ReadonlyArray<{ path: string; role: AppRole }>;

export function getDashboardPathForRole(role?: AppRole | null) {
  if (!role) {
    return roleDashboardPaths.EMPLOYEE;
  }

  return roleDashboardPaths[role];
}

export function getRequiredRoleForPath(pathname: string): AppRole | null {
  const matchedRoute = protectedDashboardRoutes.find(
    ({ path }) => pathname === path || pathname.startsWith(`${path}/`),
  );

  return matchedRoute?.role ?? null;
}

export function isAppRole(value: unknown): value is AppRole {
  return value === "EMPLOYEE" || value === "MANAGER" || value === "ADMIN";
}
