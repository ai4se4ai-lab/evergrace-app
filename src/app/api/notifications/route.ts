import { NextResponse } from "next/server";

import { markNotificationsRead } from "@/actions/member";
import { getViewer } from "@/lib/auth";
import { getNotifications } from "@/lib/queries";

/** Polled by the header bell (spec §6.8). */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ items: [], unread: 0 });

  return NextResponse.json(await getNotifications(viewer), {
    headers: { "Cache-Control": "no-store" },
  });
}

/** Bulk "mark all read". */
export async function PATCH() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await markNotificationsRead();
  return NextResponse.json(await getNotifications(viewer));
}
