import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

import {
  DASHBOARD_ROOT_PATH,
  SIGN_IN_PATH,
  getDashboardPathForRole,
  getRequiredRoleForPath,
  getSafeDashboardCallbackPath,
  isAppRole,
} from "@/lib/auth";

function redirectTo(url: URL) {
  return NextResponse.redirect(url);
}

function createSignInRedirect(request: NextRequest) {
  const signInUrl = new URL(SIGN_IN_PATH, request.url);
  const callbackUrl = getSafeDashboardCallbackPath(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  signInUrl.searchParams.set("callbackUrl", callbackUrl);

  return redirectTo(signInUrl);
}

function normalizeSignInRequest(request: NextRequest) {
  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");

  if (!callbackUrl) {
    return null;
  }

  const safeCallbackUrl = getSafeDashboardCallbackPath(callbackUrl);

  if (callbackUrl === safeCallbackUrl) {
    return null;
  }

  const signInUrl = new URL(SIGN_IN_PATH, request.url);
  signInUrl.searchParams.set("callbackUrl", safeCallbackUrl);

  return redirectTo(signInUrl);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });
  const role = isAppRole(token?.role) ? token.role : null;

  if (pathname === SIGN_IN_PATH) {
    if (token && role) {
      return redirectTo(new URL(getDashboardPathForRole(role), request.url));
    }

    return normalizeSignInRequest(request) ?? NextResponse.next();
  }

  const isDashboardRoute =
  pathname === DASHBOARD_ROOT_PATH ||
  pathname.startsWith(`${DASHBOARD_ROOT_PATH}/`);

  if (isDashboardRoute && (!token || !role)) {
    return createSignInRedirect(request);
  }

  if (role && pathname === DASHBOARD_ROOT_PATH) {
    return redirectTo(
      new URL(getDashboardPathForRole(role), request.url),
    );
  }

  const requiredRole = getRequiredRoleForPath(pathname);

  if (requiredRole && requiredRole !== role) {
    const fallbackRole = role ?? "EMPLOYEE";

    return redirectTo(
      new URL(
        getDashboardPathForRole(fallbackRole),
        request.url,
      ),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/sign-in"],
};
