import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { env, muxConfigured } from "@/lib/env";
import { muxThumbnailUrl } from "@/lib/media";
import { fanOutNewVideo } from "@/lib/notifications";

/**
 * Mux asset webhook (spec §6.10). On `video.asset.ready` we store the playback
 * id and thumbnail, promote the video to PUBLISHED, and trigger the §6.8
 * notification fan-out.
 */
export async function POST(request: NextRequest) {
  if (!muxConfigured) {
    return NextResponse.json({ error: "Mux is not configured." }, { status: 503 });
  }

  const raw = await request.text();
  const signature = request.headers.get("mux-signature");

  if (env.mux.webhookSecret) {
    if (!signature || !verifyMuxSignature(raw, signature, env.mux.webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  const event = JSON.parse(raw) as {
    type: string;
    data: {
      id?: string;
      upload_id?: string;
      playback_ids?: { id: string }[];
    };
  };

  if (event.type !== "video.asset.ready") {
    return NextResponse.json({ received: true });
  }

  const uploadId = event.data.upload_id;
  const playbackId = event.data.playback_ids?.[0]?.id;
  if (!uploadId) return NextResponse.json({ received: true });

  const video = await prisma.video.findFirst({ where: { muxAssetId: uploadId } });
  if (!video) return NextResponse.json({ received: true });

  await prisma.video.update({
    where: { id: video.id },
    data: {
      muxAssetId: event.data.id ?? video.muxAssetId,
      muxPlaybackId: playbackId ?? null,
      thumbnailUrl: playbackId ? muxThumbnailUrl(playbackId) : null,
      status: "PUBLISHED",
      publishedAt: video.publishedAt ?? new Date(),
    },
  });

  const notified = await fanOutNewVideo(video.id);
  return NextResponse.json({ received: true, notified });
}

function verifyMuxSignature(payload: string, header: string, secret: string): boolean {
  const parts = new Map(
    header.split(",").map((piece) => {
      const [key, value] = piece.split("=");
      return [key?.trim(), value?.trim()] as const;
    }),
  );
  const timestamp = parts.get("t");
  const provided = parts.get("v1");
  if (!timestamp || !provided) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}
