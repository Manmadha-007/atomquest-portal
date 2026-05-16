import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

import {
  DASHBOARD_ROOT_PATH,
  getDashboardPathForRole,
  getRequiredRoleForPath,
  isAppRole,
  SIGN_IN_PATH,
} from "@/lib/auth";

function createSignInRedirect(request: NextRequest) {
  const signInUrl = new URL(SIGN_IN_PATH, request.url);
  signInUrl.searchParams.set(
    "callbackUrl",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.redirect(signInUrl);
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }
  
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });
  const role = token?.role;

  if (!token || !isAppRole(role)) {
    return createSignInRedirect(request);
  }

  if (request.nextUrl.pathname === DASHBOARD_ROOT_PATH) {
    return NextResponse.redirect(
      new URL(getDashboardPathForRole(role), request.url),
    );
  }

  const requiredRole = getRequiredRoleForPath(request.nextUrl.pathname);

  if (requiredRole && requiredRole !== role) {
    return NextResponse.redirect(
      new URL(getDashboardPathForRole(role), request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
