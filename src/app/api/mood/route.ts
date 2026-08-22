import { NextResponse, type NextRequest } from "next/server";

import { recordMood } from "@/actions/member";
import { getViewer } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await recordMood(await request.json());
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
