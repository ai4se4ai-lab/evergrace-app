"use server";

import { revalidatePath } from "next/cache";

import { requireViewer, touchLastActive } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canFollow, progressPercent } from "@/lib/domain";
import {
  followSchema,
  lessonCompletionSchema,
  moodSchema,
  progressSchema,
  savedVideoSchema,
} from "@/lib/validation";

export type ActionResult = { ok: boolean; message?: string };

/**
 * Toggle a follow (spec §6.5). Following is a paid feature, re-checked here —
 * a disabled chip in the UI is a courtesy, not the enforcement point.
 */
export async function toggleFollow(input: unknown): Promise<ActionResult> {
  const viewer = await requireViewer();
  const { kind, targetId } = followSchema.parse(input);

  if (!canFollow(viewer.plan)) {
    return {
      ok: false,
      message: "Subscribing to skills, masters, and levels is available on the Member plan.",
    };
  }

  const key =
    kind === "CATEGORY"
      ? { categoryId: targetId }
      : kind === "MASTER"
        ? { masterId: targetId }
        : { levelId: targetId };

  const existing = await prisma.follow.findFirst({
    where: { userId: viewer.id, kind, ...key },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
  } else {
    await prisma.follow.create({ data: { userId: viewer.id, kind, ...key } });
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function recordMood(input: unknown): Promise<ActionResult> {
  const viewer = await requireViewer();
  const { score } = moodSchema.parse(input);

  await prisma.moodCheckIn.create({ data: { userId: viewer.id, score } });
  await touchLastActive(viewer.id);

  revalidatePath("/dashboard");
  return { ok: true };
}

/** Save / unsave into a My Library tab (subscribed | liked | favorite). */
export async function toggleSavedVideo(input: unknown): Promise<ActionResult> {
  const viewer = await requireViewer();
  const { videoId, kind } = savedVideoSchema.parse(input);

  const existing = await prisma.savedVideo.findFirst({
    where: { userId: viewer.id, videoId, kind },
  });

  if (existing) {
    await prisma.savedVideo.delete({ where: { id: existing.id } });
  } else {
    await prisma.savedVideo.create({ data: { userId: viewer.id, videoId, kind } });
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Watch progress. Called every ~10s while playing and on pause/ended. Never
 * moves backwards, so scrubbing to the start doesn't erase real progress.
 */
export async function recordProgress(input: unknown): Promise<ActionResult> {
  const viewer = await requireViewer();
  const { videoId, secondsWatched } = progressSchema.parse(input);

  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) return { ok: false, message: "Unknown video." };

  const existing = await prisma.progress.findUnique({
    where: { userId_videoId: { userId: viewer.id, videoId } },
  });
  const seconds = Math.max(secondsWatched, existing?.secondsWatched ?? 0);
  const percent = progressPercent(seconds, video.duration);

  await prisma.progress.upsert({
    where: { userId_videoId: { userId: viewer.id, videoId } },
    update: { secondsWatched: seconds, percent },
    create: { userId: viewer.id, videoId, secondsWatched: seconds, percent },
  });
  await touchLastActive(viewer.id);

  return { ok: true };
}

export async function setLessonComplete(input: unknown): Promise<ActionResult> {
  const viewer = await requireViewer();
  const { lessonId, complete } = lessonCompletionSchema.parse(input);

  if (complete) {
    await prisma.lessonCompletion.upsert({
      where: { userId_lessonId: { userId: viewer.id, lessonId } },
      update: {},
      create: { userId: viewer.id, lessonId },
    });
  } else {
    await prisma.lessonCompletion.deleteMany({ where: { userId: viewer.id, lessonId } });
  }

  await touchLastActive(viewer.id);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function markNotificationsRead(): Promise<ActionResult> {
  const viewer = await requireViewer();
  await prisma.notification.updateMany({
    where: { userId: viewer.id, read: false },
    data: { read: true },
  });
  return { ok: true };
}
