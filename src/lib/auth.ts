export const appRoles = [
  "EMPLOYEE",
  "MANAGER",
  "ADMIN",
] as const;

export type AppRole =
  (typeof appRoles)[number];

export const SIGN_IN_PATH =
  "/sign-in";

export const DASHBOARD_ROOT_PATH =
  "/dashboard";

const roleDashboardPaths = {
  ADMIN: "/dashboard/admin",

  MANAGER:
    "/dashboard/manager/team-goals",

  EMPLOYEE:
    "/dashboard/employee",
} satisfies Record<AppRole, string>;

const protectedDashboardRoutes =
  [
    {
      path: "/dashboard/admin",
      role: "ADMIN",
    },

    {
      path: "/dashboard/manager",
      role: "MANAGER",
    },

    {
      path: "/dashboard/employee",
      role: "EMPLOYEE",
    },
  ] as const satisfies ReadonlyArray<{
    path: string;
    role: AppRole;
  }>;

const sortedProtectedDashboardRoutes =
  [...protectedDashboardRoutes].sort(
    (a, b) =>
      b.path.length - a.path.length,
  );

export function getDashboardPathForRole(
  role: AppRole,
) {
  return roleDashboardPaths[role];
}

export function getRequiredRoleForPath(
  pathname: string,
): AppRole | null {
  const matchedRoute =
    sortedProtectedDashboardRoutes.find(
      ({ path }) =>
        pathname === path ||
        pathname.startsWith(
          `${path}/`,
        ),
    );

  return matchedRoute?.role ?? null;
}

export function isAppRole(
  value: unknown,
): value is AppRole {
  return appRoles.some(
    (role) => role === value,
  );
}

export function getSafeDashboardCallbackPath(
  value?: string | null,
): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return DASHBOARD_ROOT_PATH;
  }

  let url: URL;

  try {
    url = new URL(
      value,
      "https://atomquest.local",
    );
  } catch {
    return DASHBOARD_ROOT_PATH;
  }

  if (
    url.pathname === SIGN_IN_PATH ||
    url.pathname.startsWith(
      "/api/auth",
    ) ||
    !(
      url.pathname ===
        DASHBOARD_ROOT_PATH ||
      url.pathname.startsWith(
        `${DASHBOARD_ROOT_PATH}/`,
      )
    )
  ) {
    return DASHBOARD_ROOT_PATH;
  }

  url.searchParams.delete(
    "callbackUrl",
  );

  const normalizedPath =
    url.pathname !== "/" &&
    url.pathname.endsWith("/")
      ? url.pathname.slice(0, -1)
      : url.pathname;

  return `${normalizedPath}${url.search}`;
}