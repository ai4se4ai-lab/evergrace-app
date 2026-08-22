import "server-only";

import { prisma } from "./db";
import { categoryReason, levelReason, masterReason } from "./domain";

/**
 * Publish fan-out — spec §6.8.
 *
 * Called whenever a video transitions into PUBLISHED (admin action or the
 * asset-ready webhook). For every Follow that matches the video's category,
 * master, or level, insert one Notification with the prototype's exact reason
 * copy. A member who follows two matching axes gets one notification, with the
 * most specific reason.
 *
 * In the spec's target architecture this runs as an Inngest job. Here it runs
 * inline inside the publishing transaction's aftermath — correct, and at MVP
 * roster size (hundreds of members) fast enough. `fanOutNewVideo` is the seam
 * to move into a queue: see docs/ARCHITECTURE.md.
 */
export async function fanOutNewVideo(videoId: string): Promise<number> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { category: true, master: true, level: true },
  });
  if (!video || video.status !== "PUBLISHED") return 0;

  const follows = await prisma.follow.findMany({
    where: {
      OR: [
        { categoryId: video.categoryId },
        ...(video.masterId ? [{ masterId: video.masterId }] : []),
        ...(video.levelId ? [{ levelId: video.levelId }] : []),
      ],
    },
  });

  // One notification per member; prefer the most specific reason.
  const reasonByUser = new Map<string, string>();
  for (const follow of follows) {
    const reason =
      follow.masterId && video.master
        ? masterReason(video.master.name)
        : follow.levelId && video.level
          ? levelReason(video.level.name)
          : categoryReason(video.category.name);

    const existing = reasonByUser.get(follow.userId);
    if (!existing || reasonPriority(reason) > reasonPriority(existing)) {
      reasonByUser.set(follow.userId, reason);
    }
  }

  if (reasonByUser.size === 0) return 0;

  // Skip members who already have a notification for this video, so a
  // re-publish (draft → published → draft → published) does not duplicate.
  const already = await prisma.notification.findMany({
    where: { videoId, userId: { in: [...reasonByUser.keys()] } },
    select: { userId: true },
  });
  for (const row of already) reasonByUser.delete(row.userId);
  if (reasonByUser.size === 0) return 0;

  await prisma.notification.createMany({
    data: [...reasonByUser.entries()].map(([userId, reason]) => ({ userId, videoId, reason })),
  });
  return reasonByUser.size;
}

function reasonPriority(reason: string): number {
  if (reason.startsWith("New from Master")) return 2;
  if (reason.startsWith("New in Level")) return 1;
  return 0;
}
