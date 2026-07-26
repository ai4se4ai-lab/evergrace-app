"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fanOutNewVideo } from "@/lib/notifications";
import { parseTranscript } from "@/lib/transcript";
import {
  chapterSchema,
  lessonSchema,
  transcriptSchema,
  videoUpdateSchema,
} from "@/lib/validation";

import type { AdminResult } from "./admin";

/**
 * Editing an existing video: metadata, syllabus (chapters → lessons), and the
 * transcript. Every action re-checks the admin role server-side (spec §5).
 */

// ---------------------------------------------------------------------------
// The video itself
// ---------------------------------------------------------------------------

/**
 * Full edit. As in `setVideoStatus`, moving into PUBLISHED from any other status
 * triggers the §6.8 fan-out — that rule lives in one place regardless of which
 * screen changed the status.
 */
export async function updateVideo(input: unknown): Promise<AdminResult> {
  await requireAdmin();
  const parsed = videoUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const data = parsed.data;

  const before = await prisma.video.findUnique({ where: { id: data.id } });
  if (!before) return { ok: false, message: "Unknown video." };

  await prisma.video.update({
    where: { id: data.id },
    data: {
      title: data.title,
      summary: data.summary ?? "",
      categoryId: data.categoryId,
      masterId: data.masterId || null,
      levelId: data.levelId || null,
      access: data.access,
      status: data.status,
      intensity: data.intensity,
      stance: data.stance,
      duration: data.durationMinutes * 60,
      sourceUrl: data.sourceUrl || null,
      publishedAt:
        data.status === "PUBLISHED" ? (before.publishedAt ?? new Date()) : before.publishedAt,
    },
  });

  let notified = 0;
  if (data.status === "PUBLISHED" && before.status !== "PUBLISHED") {
    notified = await fanOutNewVideo(data.id);
  }

  revalidateVideo(data.id, before.slug);
  return {
    ok: true,
    message: notified > 0 ? `Saved — ${notified} member(s) notified.` : "Saved.",
  };
}

/**
 * Deletes a video and everything hanging off it. The member roster is read-only
 * in v1 (§6.11), but the catalog does need removal — a mis-uploaded video has to
 * be retractable. Member progress against it cascades away, so the message says
 * how much is going.
 */
export async function deleteVideo(videoId: string): Promise<AdminResult> {
  await requireAdmin();

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { _count: { select: { progress: true } } },
  });
  if (!video) return { ok: false, message: "Unknown video." };

  await prisma.video.delete({ where: { id: videoId } });
  revalidateVideo(videoId, video.slug);

  return {
    ok: true,
    message:
      video._count.progress > 0
        ? `Deleted “${video.title}” and ${video._count.progress} progress record(s).`
        : `Deleted “${video.title}”.`,
  };
}

// ---------------------------------------------------------------------------
// Syllabus
// ---------------------------------------------------------------------------

export async function saveChapter(input: unknown): Promise<AdminResult> {
  await requireAdmin();
  const parsed = chapterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { id, videoId, title } = parsed.data;

  if (id) {
    await prisma.chapter.update({ where: { id }, data: { title } });
  } else {
    await prisma.chapter.create({
      data: { videoId, title, order: await prisma.chapter.count({ where: { videoId } }) },
    });
  }

  revalidatePath(`/admin/videos/${videoId}`);
  return { ok: true, message: id ? `Renamed to “${title}”.` : `Added “${title}”.` };
}

export async function deleteChapter(chapterId: string): Promise<AdminResult> {
  await requireAdmin();

  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) return { ok: false, message: "Unknown chapter." };

  await prisma.chapter.delete({ where: { id: chapterId } });

  // Close the gap so `order` stays 0..n-1.
  const remaining = await prisma.chapter.findMany({
    where: { videoId: chapter.videoId },
    orderBy: { order: "asc" },
  });
  await prisma.$transaction(
    remaining.map((row, index) =>
      prisma.chapter.update({ where: { id: row.id }, data: { order: index } }),
    ),
  );

  revalidatePath(`/admin/videos/${chapter.videoId}`);
  return { ok: true, message: `Removed “${chapter.title}” and its lessons.` };
}

export async function moveChapter(chapterId: string, direction: -1 | 1): Promise<AdminResult> {
  await requireAdmin();

  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) return { ok: false, message: "Unknown chapter." };

  const siblings = await prisma.chapter.findMany({
    where: { videoId: chapter.videoId },
    orderBy: { order: "asc" },
  });
  const index = siblings.findIndex((row) => row.id === chapterId);
  const target = index + direction;
  if (target < 0 || target >= siblings.length) return { ok: true };

  await prisma.$transaction([
    prisma.chapter.update({ where: { id: siblings[index].id }, data: { order: target } }),
    prisma.chapter.update({ where: { id: siblings[target].id }, data: { order: index } }),
  ]);

  revalidatePath(`/admin/videos/${chapter.videoId}`);
  return { ok: true };
}

export async function saveLesson(input: unknown): Promise<AdminResult> {
  await requireAdmin();
  const parsed = lessonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { id, chapterId, title, durationMinutes } = parsed.data;

  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) return { ok: false, message: "Unknown chapter." };

  if (id) {
    await prisma.lesson.update({ where: { id }, data: { title, duration: durationMinutes * 60 } });
  } else {
    await prisma.lesson.create({
      data: {
        chapterId,
        title,
        duration: durationMinutes * 60,
        order: await prisma.lesson.count({ where: { chapterId } }),
      },
    });
  }

  revalidatePath(`/admin/videos/${chapter.videoId}`);
  return { ok: true, message: id ? `Updated “${title}”.` : `Added “${title}”.` };
}

export async function deleteLesson(lessonId: string): Promise<AdminResult> {
  await requireAdmin();

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { chapter: true },
  });
  if (!lesson) return { ok: false, message: "Unknown lesson." };

  await prisma.lesson.delete({ where: { id: lessonId } });

  const remaining = await prisma.lesson.findMany({
    where: { chapterId: lesson.chapterId },
    orderBy: { order: "asc" },
  });
  await prisma.$transaction(
    remaining.map((row, index) =>
      prisma.lesson.update({ where: { id: row.id }, data: { order: index } }),
    ),
  );

  revalidatePath(`/admin/videos/${lesson.chapter.videoId}`);
  return { ok: true, message: `Removed “${lesson.title}”.` };
}

// ---------------------------------------------------------------------------
// Transcript
// ---------------------------------------------------------------------------

/**
 * Replaces a video's transcript from a block of `m:ss  text` lines. Rewriting
 * wholesale rather than diffing keeps the editor honest: what staff see in the
 * textarea is exactly what is stored. Parsing lives in `lib/transcript.ts` so it
 * can be unit-tested without a request context.
 */
export async function saveTranscript(input: unknown): Promise<AdminResult> {
  await requireAdmin();
  const parsed = transcriptSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { videoId, text } = parsed.data;

  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) return { ok: false, message: "Unknown video." };

  const result = parseTranscript(text);
  if (!result.ok) return { ok: false, message: result.error };
  const { lines } = result;

  await prisma.$transaction([
    prisma.transcriptLine.deleteMany({ where: { videoId } }),
    ...(lines.length > 0
      ? [prisma.transcriptLine.createMany({ data: lines.map((l) => ({ videoId, ...l })) })]
      : []),
  ]);

  revalidateVideo(videoId, video.slug);
  return { ok: true, message: `Saved ${lines.length} transcript line(s).` };
}

function revalidateVideo(videoId: string, slug: string): void {
  revalidatePath("/admin/videos");
  revalidatePath(`/admin/videos/${videoId}`);
  revalidatePath("/library");
  revalidatePath(`/library/${slug}`);
  revalidatePath("/dashboard");
}
