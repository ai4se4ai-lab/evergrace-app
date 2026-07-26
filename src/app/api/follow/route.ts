import { NextResponse, type NextRequest } from "next/server";

import { toggleFollow } from "@/actions/member";
import { getViewer } from "@/lib/auth";

/**
 * Both verbs toggle, because `toggleFollow` is idempotent per (user, target):
 * POST adds when absent, DELETE removes when present.
 */
async function handle(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await toggleFollow(await request.json());
    return NextResponse.json(result, { status: result.ok ? 200 : 403 });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export const POST = handle;
export const DELETE = handle;
