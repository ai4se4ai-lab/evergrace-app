"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/domain";
import { createDirectUpload, muxConfigured } from "@/lib/media";
import { fanOutNewVideo } from "@/lib/notifications";
import {
  levelReorderSchema,
  levelSchema,
  videoAccessSchema,
  videoStatusSchema,
  videoUploadSchema,
} from "@/lib/validation";

export type AdminResult = { ok: boolean; message?: string };

/** Every action re-checks the admin role server-side (spec §5). */

export async function setVideoAccess(input: unknown): Promise<AdminResult> {
  await requireAdmin();
  const { videoId, access } = videoAccessSchema.parse(input);

  await prisma.video.update({ where: { id: videoId }, data: { access } });

  revalidatePath("/admin/videos");
  revalidatePath("/library");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Status changes are the trigger for the notification fan-out: a video entering
 * PUBLISHED notifies every member following its category, master, or level.
 */
export async function setVideoStatus(input: unknown): Promise<AdminResult> {
  await requireAdmin();
  const { videoId, status } = videoStatusSchema.parse(input);

  const before = await prisma.video.findUnique({ where: { id: videoId } });
  if (!before) return { ok: false, message: "Unknown video." };

  await prisma.video.update({
    where: { id: videoId },
    data: {
      status,
      publishedAt: status === "PUBLISHED" ? (before.publishedAt ?? new Date()) : before.publishedAt,
    },
  });

  let notified = 0;
  if (status === "PUBLISHED" && before.status !== "PUBLISHED") {
    notified = await fanOutNewVideo(videoId);
  }

  revalidatePath("/admin/videos");
  revalidatePath("/library");
  return {
    ok: true,
    message: notified > 0 ? `Published — ${notified} member(s) notified.` : undefined,
  };
}

/**
 * Requests an upload target. With Mux configured this is a direct-upload URL
 * the browser PUTs to; otherwise it is a local correlation id and the admin
 * supplies a source URL instead (spec §6.10, docs/INTEGRATIONS.md).
 */
export async function requestUploadTarget(): Promise<{
  mode: "mux" | "local";
  uploadUrl?: string;
  uploadId: string;
}> {
  await requireAdmin();
  return createDirectUpload();
}

export async function createVideo(input: unknown): Promise<AdminResult & { videoId?: string }> {
  await requireAdmin();
  const parsed = videoUploadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  // Slugs must stay unique; append a short suffix on collision.
  let slug = slugify(data.title);
  if (await prisma.video.findUnique({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  // The video always starts in PROCESSING: the asset-ready webhook decides
  // whether it becomes PUBLISHED or stays DRAFT. This keeps the local and Mux
  // paths identical.
  const video = await prisma.video.create({
    data: {
      title: data.title,
      slug,
      summary: data.summary ?? "",
      categoryId: data.categoryId,
      masterId: data.masterId || null,
      levelId: data.levelId || null,
      access: data.access,
      intensity: data.intensity,
      stance: data.stance,
      duration: data.durationMinutes * 60,
      status: "PROCESSING",
      sourceUrl: data.sourceUrl || null,
      muxAssetId: muxConfigured ? (data.uploadId ?? null) : null,
    },
  });

  revalidatePath("/admin/videos");
  return {
    ok: true,
    videoId: video.id,
    message: muxConfigured
      ? "Uploaded. Mux is processing the asset — it will publish automatically when ready."
      : "Created and processing. It publishes as soon as the asset-ready webhook arrives.",
  };
}

export async function saveLevel(input: unknown): Promise<AdminResult> {
  await requireAdmin();
  const parsed = levelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { id, name, description, videoIds } = parsed.data;

  const levelId = id
    ? (await prisma.level.update({ where: { id }, data: { name, description } })).id
    : (
        await prisma.level.create({
          data: { name, description, order: await prisma.level.count() },
        })
      ).id;

  // A video belongs to exactly one level, so assigning here also detaches any
  // video that was removed from this level's selection.
  await prisma.video.updateMany({ where: { levelId }, data: { levelId: null } });
  if (videoIds.length > 0) {
    await prisma.video.updateMany({ where: { id: { in: videoIds } }, data: { levelId } });
  }

  revalidatePath("/admin/videos/levels");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteLevel(levelId: string): Promise<AdminResult> {
  await requireAdmin();

  await prisma.video.updateMany({ where: { levelId }, data: { levelId: null } });
  await prisma.level.delete({ where: { id: levelId } });

  // Close the gap in `order` so the LVL badges stay 0..n-1.
  // One transaction, not Promise.all: concurrent writes contend on SQLite, and
  // a partially applied reorder would leave `order` inconsistent.
  const remaining = await prisma.level.findMany({ orderBy: { order: "asc" } });
  await prisma.$transaction(
    remaining.map((level, index) =>
      prisma.level.update({ where: { id: level.id }, data: { order: index } }),
    ),
  );

  revalidatePath("/admin/videos/levels");
  return { ok: true };
}

export async function reorderLevels(input: unknown): Promise<AdminResult> {
  await requireAdmin();
  const { orderedIds } = levelReorderSchema.parse(input);

  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.level.update({ where: { id }, data: { order: index } })),
  );

  revalidatePath("/admin/videos/levels");
  return { ok: true };
}
