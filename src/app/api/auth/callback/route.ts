import { NextResponse, type NextRequest } from "next/server";

import { consumeMagicLink } from "@/lib/auth";

/** Magic-link landing point. Consumes the token, then sends the member home. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing-token", request.url));
  }

  const viewer = await consumeMagicLink(token);
  if (!viewer) {
    return NextResponse.redirect(new URL("/login?error=expired", request.url));
  }

  const next = viewer.track ? "/dashboard" : "/onboarding";
  return NextResponse.redirect(new URL(next, request.url));
}
