import { NextResponse, type NextRequest } from "next/server";

import { secretsMatch } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env, muxConfigured } from "@/lib/env";
import { fanOutNewVideo } from "@/lib/notifications";

/**
 * Local stand-in for Mux's `video.asset.ready` (see docs/INTEGRATIONS.md).
 * Same contract, same side effects: promote PROCESSING → PUBLISHED and fan out
 * notifications, so the publish path is exercised end-to-end without Mux.
 *
 *   curl -X POST http://localhost:3000/api/media/webhook \
 *     -H "content-type: application/json" \
 *     -H "x-cron-secret: local-dev-cron-secret" \
 *     -d '{"videoId":"...","publish":true}'
 */
export async function POST(request: NextRequest) {
  if (muxConfigured) {
    return NextResponse.json(
      { error: "Mux is configured — use /api/mux/webhook." },
      { status: 409 },
    );
  }

  const provided = request.headers.get("x-cron-secret");
  if (!env.cronSecret || !provided || !secretsMatch(provided, env.cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    videoId?: string;
    sourceUrl?: string;
    publish?: boolean;
  };
  if (!body.videoId) {
    return NextResponse.json({ error: "videoId is required" }, { status: 400 });
  }

  const video = await prisma.video.findUnique({ where: { id: body.videoId } });
  if (!video) return NextResponse.json({ error: "Unknown video" }, { status: 404 });

  const publish = body.publish !== false;
  await prisma.video.update({
    where: { id: video.id },
    data: {
      sourceUrl: body.sourceUrl ?? video.sourceUrl,
      status: publish ? "PUBLISHED" : "DRAFT",
      publishedAt: publish ? (video.publishedAt ?? new Date()) : video.publishedAt,
    },
  });

  const notified = publish ? await fanOutNewVideo(video.id) : 0;
  return NextResponse.json({ received: true, status: publish ? "PUBLISHED" : "DRAFT", notified });
}
