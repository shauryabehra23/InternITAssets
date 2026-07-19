import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  // Session validation moved to route handlers via getSession() + requireUser()
  // because iron-session cannot run in Edge runtime.
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
