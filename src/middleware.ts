import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * First line of route protection (spec §5). This only checks for the *presence*
 * of a session cookie — the Edge runtime has no database access, so it cannot
 * know a role. Every protected page and every admin Server Action re-checks the
 * real session and role server-side; middleware exists to avoid rendering a
 * signed-out shell, not to enforce authorization.
 */
const MEMBER_PATHS = ["/dashboard", "/account"];
const ADMIN_PATHS = ["/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/admin/login") return NextResponse.next();

  const needsAdmin = ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (needsAdmin && !hasSession) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const needsMember = MEMBER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (needsMember && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/account/:path*", "/admin/:path*"],
};
