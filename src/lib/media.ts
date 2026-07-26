import "server-only";

import { env, muxConfigured } from "./env";

/**
 * Video hosting boundary — spec §6.10.
 *
 * With Mux credentials present, the admin upload form asks for a direct-upload
 * URL and the browser PUTs the file straight to Mux; `video.asset.ready`
 * arrives at /api/mux/webhook and fills in `muxPlaybackId`.
 *
 * Without credentials (the MVP default) the same screen accepts a direct video
 * URL instead. The Video row is still created with status PROCESSING and the
 * same /api/media/webhook route promotes it to PUBLISHED, so the publish →
 * notification fan-out path is identical in both modes.
 */

export type DirectUpload = {
  mode: "mux" | "local";
  /** Present in mux mode: PUT the file here. */
  uploadUrl?: string;
  /** Correlates the eventual webhook back to the Video row. */
  uploadId: string;
};

export async function createDirectUpload(): Promise<DirectUpload> {
  if (!muxConfigured) {
    return { mode: "local", uploadId: `local_${Date.now().toString(36)}` };
  }

  const response = await fetch("https://api.mux.com/video/v1/uploads", {
    method: "POST",
    headers: {
      Authorization: `Basic ${muxAuth()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cors_origin: env.appUrl,
      new_asset_settings: { playback_policy: ["signed"], encoding_tier: "smart" },
    }),
  });
  if (!response.ok) {
    throw new Error(`Mux upload creation failed (${response.status}): ${await response.text()}`);
  }

  const { data } = (await response.json()) as { data: { id: string; url: string } };
  return { mode: "mux", uploadUrl: data.url, uploadId: data.id };
}

export function muxThumbnailUrl(playbackId: string): string {
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640&fit_mode=preserve`;
}

function muxAuth(): string {
  return Buffer.from(`${env.mux.tokenId}:${env.mux.tokenSecret}`).toString("base64");
}

export { muxConfigured };
