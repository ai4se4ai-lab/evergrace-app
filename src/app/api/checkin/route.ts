import { NextResponse, type NextRequest } from "next/server";

import { submitHealthCheckIn } from "@/actions/onboarding";

/** POST the four health answers; the track is computed server-side (§6.2). */
export async function POST(request: NextRequest) {
  try {
    const result = await submitHealthCheckIn(await request.json());
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
