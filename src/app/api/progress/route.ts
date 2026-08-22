import { NextResponse, type NextRequest } from "next/server";

import { recordProgress } from "@/actions/member";
import { getViewer } from "@/lib/auth";

/**
 * Watch-progress heartbeat from the player. Kept as a route (not only a Server
 * Action) so it can be sent with `navigator.sendBeacon` on page unload.
 */
export async function PATCH(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await recordProgress(await request.json());
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export const POST = PATCH;
