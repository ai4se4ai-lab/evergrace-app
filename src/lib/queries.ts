import "server-only";

import { prisma } from "./db";
import type { Viewer } from "./auth";
import {
  ACCESS_LABEL,
  canView,
  computeStreak,
  deriveMemberStatus,
  formatDuration,
  INTENSITY_LABEL,
  STANCE_LABEL,
  type AccessLevel,
  type Intensity,
  type MemberStatus,
  type Plan,
  type Stance,
  type Track,
  type VideoStatus,
} from "./domain";
import { serializeTranscript } from "./transcript";
import type { RosterFilter } from "./validation";

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export type VideoCard = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  categoryName: string;
  masterName: string | null;
  levelName: string | null;
  intensity: Intensity;
  stance: Stance;
  durationSeconds: number;
  access: AccessLevel;
  status: VideoStatus;
  thumbnailUrl: string | null;
  /** Always populated, even when locked — "no surprises" (spec §6.7). */
  metaLine: string;
  durationLabel: string;
  accessLabel: string;
  locked: boolean;
  percent: number;
};

export type CatalogFilters = {
  focus?: string;
  intensity?: string;
  stance?: string;
  master?: string;
};

const videoInclude = {
  category: true,
  master: true,
  level: true,
} as const;

type VideoRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  intensity: string;
  stance: string;
  duration: number;
  access: string;
  status: string;
  thumbnailUrl: string | null;
  category: { name: string };
  master: { name: string } | null;
  level: { name: string } | null;
};

function toCard(video: VideoRow, viewer: Viewer | null, percent = 0): VideoCard {
  const access = video.access as AccessLevel;
  const intensity = video.intensity as Intensity;
  const stance = video.stance as Stance;

  return {
    id: video.id,
    slug: video.slug,
    title: video.title,
    summary: video.summary,
    categoryName: video.category.name,
    masterName: video.master?.name ?? null,
    levelName: video.level?.name ?? null,
    intensity,
    stance,
    durationSeconds: video.duration,
    access,
    status: video.status as VideoStatus,
    thumbnailUrl: video.thumbnailUrl,
    metaLine: [
      INTENSITY_LABEL[intensity],
      STANCE_LABEL[stance],
      video.category.name,
      formatDuration(video.duration),
    ].join(" · "),
    durationLabel: formatDuration(video.duration),
    accessLabel: ACCESS_LABEL[access],
    locked: !canView({ access }, viewer),
    percent,
  };
}

export async function getCatalog(
  filters: CatalogFilters,
  viewer: Viewer | null,
): Promise<VideoCard[]> {
  const videos = await prisma.video.findMany({
    where: {
      status: "PUBLISHED",
      ...(filters.focus && filters.focus !== "Seated"
        ? { category: { name: filters.focus } }
        : {}),
      ...(filters.focus === "Seated" ? { stance: "SEATED" } : {}),
      ...(filters.intensity ? { intensity: filters.intensity } : {}),
      ...(filters.stance ? { stance: filters.stance } : {}),
      ...(filters.master ? { master: { name: filters.master } } : {}),
    },
    include: videoInclude,
    orderBy: [{ createdAt: "asc" }],
  });

  const progress = viewer ? await progressMap(viewer.id) : new Map<string, number>();
  return videos.map((v) => toCard(v, viewer, progress.get(v.id) ?? 0));
}

export async function getCatalogFacets() {
  const [categories, masters] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.master.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { categories, masters };
}

async function progressMap(userId: string): Promise<Map<string, number>> {
  const rows = await prisma.progress.findMany({ where: { userId } });
  return new Map(rows.map((r) => [r.videoId, r.percent]));
}

// ---------------------------------------------------------------------------
// Video detail
// ---------------------------------------------------------------------------

export type VideoDetail = VideoCard & {
  sourceUrl: string | null;
  muxPlaybackId: string | null;
  secondsWatched: number;
  transcript: { id: string; startSeconds: number; timecode: string; text: string }[];
  chapters: {
    id: string;
    title: string;
    completeLabel: string;
    lessons: { id: string; title: string; durationLabel: string; done: boolean }[];
  }[];
  lessonsTotal: number;
  lessonsDone: number;
  saved: Record<string, boolean>;
};

export async function getVideoDetail(
  idOrSlug: string,
  viewer: Viewer | null,
): Promise<VideoDetail | null> {
  const video = await prisma.video.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: {
      ...videoInclude,
      transcriptLines: { orderBy: { startSeconds: "asc" } },
      chapters: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } },
    },
  });
  if (!video) return null;
  if (video.status !== "PUBLISHED" && viewer?.role !== "ADMIN") return null;

  const [progress, completions, saved] = await Promise.all([
    viewer
      ? prisma.progress.findUnique({ where: { userId_videoId: { userId: viewer.id, videoId: video.id } } })
      : null,
    viewer
      ? prisma.lessonCompletion.findMany({
          where: { userId: viewer.id, lesson: { chapter: { videoId: video.id } } },
        })
      : [],
    viewer ? prisma.savedVideo.findMany({ where: { userId: viewer.id, videoId: video.id } }) : [],
  ]);

  const doneIds = new Set(completions.map((c) => c.lessonId));
  const card = toCard(video, viewer, progress?.percent ?? 0);
  const locked = card.locked;

  let lessonsTotal = 0;
  let lessonsDone = 0;
  const chapters = video.chapters.map((chapter) => {
    const lessons = chapter.lessons.map((lesson) => {
      lessonsTotal += 1;
      const done = doneIds.has(lesson.id);
      if (done) lessonsDone += 1;
      return {
        id: lesson.id,
        title: lesson.title,
        durationLabel: formatDuration(lesson.duration),
        done,
      };
    });
    const chapterDone = lessons.filter((l) => l.done).length;
    return {
      id: chapter.id,
      title: chapter.title,
      completeLabel: `${chapterDone} of ${lessons.length} complete`,
      lessons,
    };
  });

  return {
    ...card,
    // A locked video never receives a playable source — the lock is enforced on
    // the server, not by hiding a play button (spec §6.7).
    sourceUrl: locked ? null : video.sourceUrl,
    muxPlaybackId: locked ? null : video.muxPlaybackId,
    secondsWatched: progress?.secondsWatched ?? 0,
    transcript: video.transcriptLines.map((line) => ({
      id: line.id,
      startSeconds: line.startSeconds,
      timecode: `${Math.floor(line.startSeconds / 60)}:${String(line.startSeconds % 60).padStart(2, "0")}`,
      text: line.text,
    })),
    chapters,
    lessonsTotal,
    lessonsDone,
    saved: Object.fromEntries(saved.map((s) => [s.kind, true])),
  };
}

// ---------------------------------------------------------------------------
// Dashboard (spec §6.4)
// ---------------------------------------------------------------------------

export type DashboardData = {
  stats: { streak: number; minutesThisMonth: number; sessions: number; lessonsComplete: number };
  weeklyMinutes: { week: string; minutes: number }[];
  focusBreakdown: { label: string; minutes: number; percent: number }[];
  suggested: VideoCard | null;
  mood: number | null;
  follows: {
    categories: { id: string; name: string; following: boolean }[];
    masters: { id: string; name: string; style: string | null; following: boolean }[];
    levels: { id: string; name: string; following: boolean }[];
    count: number;
  };
  newForYou: (VideoCard & { reason: string })[];
  library: Record<string, (VideoCard & { progressLabel: string })[]>;
};

export async function getDashboardData(viewer: Viewer): Promise<DashboardData> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [progressRows, completions, moods, categories, masters, levels, follows, savedRows] =
    await Promise.all([
      prisma.progress.findMany({
        where: { userId: viewer.id },
        include: { video: { include: videoInclude } },
      }),
      prisma.lessonCompletion.findMany({ where: { userId: viewer.id } }),
      prisma.moodCheckIn.findMany({
        where: { userId: viewer.id },
        orderBy: { createdAt: "desc" },
        take: 1,
      }),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.master.findMany({ orderBy: { name: "asc" } }),
      prisma.level.findMany({ orderBy: { order: "asc" } }),
      prisma.follow.findMany({ where: { userId: viewer.id } }),
      prisma.savedVideo.findMany({
        where: { userId: viewer.id },
        include: { video: { include: videoInclude } },
      }),
    ]);

  // --- stats ---------------------------------------------------------------
  const minutesThisMonth = Math.round(
    progressRows
      .filter((p) => p.updatedAt >= monthStart)
      .reduce((sum, p) => sum + p.secondsWatched, 0) / 60,
  );
  const stats = {
    streak: computeStreak(progressRows.map((p) => p.updatedAt), now),
    minutesThisMonth,
    sessions: progressRows.filter((p) => p.percent > 0).length,
    lessonsComplete: completions.length,
  };

  // --- charts --------------------------------------------------------------
  const weeklyMinutes = buildWeeklyMinutes(progressRows, now);

  const byCategory = new Map<string, number>();
  for (const row of progressRows) {
    const key = row.video.category.name;
    byCategory.set(key, (byCategory.get(key) ?? 0) + row.secondsWatched);
  }
  const totalSeconds = [...byCategory.values()].reduce((a, b) => a + b, 0);
  const focusBreakdown = [...byCategory.entries()]
    .map(([label, seconds]) => ({
      label,
      minutes: Math.round(seconds / 60),
      percent: totalSeconds > 0 ? Math.round((seconds / totalSeconds) * 100) : 0,
    }))
    .sort((a, b) => b.minutes - a.minutes);

  // --- today's suggested session ------------------------------------------
  const suggested = await getSuggestedSession(viewer, progressRows.map((p) => p.videoId));

  // --- follows -------------------------------------------------------------
  const followedCategoryIds = new Set(follows.filter((f) => f.categoryId).map((f) => f.categoryId!));
  const followedMasterIds = new Set(follows.filter((f) => f.masterId).map((f) => f.masterId!));
  const followedLevelIds = new Set(follows.filter((f) => f.levelId).map((f) => f.levelId!));

  // --- new for you ---------------------------------------------------------
  const candidates =
    follows.length > 0
      ? await prisma.video.findMany({
          where: {
            status: "PUBLISHED",
            OR: [
              { categoryId: { in: [...followedCategoryIds] } },
              { masterId: { in: [...followedMasterIds] } },
              { levelId: { in: [...followedLevelIds] } },
            ],
          },
          include: videoInclude,
          orderBy: { createdAt: "desc" },
          take: 8,
        })
      : [];

  const progressByVideo = new Map(progressRows.map((p) => [p.videoId, p.percent]));
  const newForYou = candidates.map((video) => {
    const reasons: string[] = [];
    if (followedCategoryIds.has(video.categoryId)) reasons.push(video.category.name);
    if (video.masterId && followedMasterIds.has(video.masterId)) {
      reasons.push(`Master ${video.master!.name}`);
    }
    if (video.levelId && followedLevelIds.has(video.levelId)) reasons.push(video.level!.name);
    return {
      ...toCard(video, viewer, progressByVideo.get(video.id) ?? 0),
      reason: `Matches ${reasons.slice(0, 2).join(" · ")}`,
    };
  });

  // --- my library ----------------------------------------------------------
  const library: DashboardData["library"] = { subscribed: [], liked: [], favorite: [] };
  for (const row of savedRows) {
    const card = toCard(row.video, viewer, progressByVideo.get(row.videoId) ?? 0);
    const bucket = library[row.kind];
    if (!bucket) continue;
    bucket.push({
      ...card,
      progressLabel: card.percent >= 100 ? "Completed" : `${card.percent}% watched`,
    });
  }

  return {
    stats,
    weeklyMinutes,
    focusBreakdown,
    suggested,
    mood: moods[0]?.score ?? null,
    follows: {
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        following: followedCategoryIds.has(c.id),
      })),
      masters: masters.map((m) => ({
        id: m.id,
        name: m.name,
        style: m.style,
        following: followedMasterIds.has(m.id),
      })),
      levels: levels.map((l) => ({ id: l.id, name: l.name, following: followedLevelIds.has(l.id) })),
      count: follows.length,
    },
    newForYou,
    library,
  };
}

/** Last 8 ISO weeks of practice minutes (spec §6.4). */
function buildWeeklyMinutes(
  rows: { updatedAt: Date; secondsWatched: number }[],
  now: Date,
): { week: string; minutes: number }[] {
  const buckets: { week: string; minutes: number }[] = [];
  for (let i = 7; i >= 0; i -= 1) {
    const end = new Date(now);
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    const seconds = rows
      .filter((r) => r.updatedAt > start && r.updatedAt <= end)
      .reduce((sum, r) => sum + r.secondsWatched, 0);
    buckets.push({ week: `W${8 - i}`, minutes: Math.round(seconds / 60) });
  }
  return buckets;
}

/** First published video matching the member's track that they haven't started. */
async function getSuggestedSession(
  viewer: Viewer,
  startedVideoIds: string[],
): Promise<VideoCard | null> {
  const stance = viewer.track ? trackStance(viewer.track) : undefined;

  const video =
    (await prisma.video.findFirst({
      where: {
        status: "PUBLISHED",
        id: { notIn: startedVideoIds },
        ...(stance ? { stance: { in: stance } } : {}),
      },
      include: videoInclude,
      orderBy: [{ level: { order: "asc" } }, { createdAt: "asc" }],
    })) ??
    (await prisma.video.findFirst({
      where: { status: "PUBLISHED", ...(stance ? { stance: { in: stance } } : {}) },
      include: videoInclude,
      orderBy: { createdAt: "asc" },
    }));

  return video ? toCard(video, viewer) : null;
}

function trackStance(track: Track): Stance[] {
  if (track === "SEATED") return ["SEATED"];
  if (track === "SUPPORTED") return ["SEATED", "SUPPORTED"];
  return ["SEATED", "SUPPORTED", "FREE_STANDING"];
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationItem = {
  id: string;
  title: string;
  slug: string;
  reason: string;
  createdAt: string;
  read: boolean;
  accessLabel: string;
  locked: boolean;
};

export async function getNotifications(viewer: Viewer): Promise<{
  items: NotificationItem[];
  unread: number;
}> {
  const rows = await prisma.notification.findMany({
    where: { userId: viewer.id },
    include: { video: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return {
    items: rows.map((n) => ({
      id: n.id,
      title: n.video.title,
      slug: n.video.slug,
      reason: n.reason,
      createdAt: n.createdAt.toISOString(),
      read: n.read,
      accessLabel: ACCESS_LABEL[n.video.access as AccessLevel],
      locked: !canView({ access: n.video.access as AccessLevel }, viewer),
    })),
    unread: rows.filter((n) => !n.read).length,
  };
}

// ---------------------------------------------------------------------------
// Admin — reports & roster (spec §6.9, §6.11)
// ---------------------------------------------------------------------------

export type RosterRow = {
  id: string;
  name: string;
  email: string;
  age: number | null;
  track: Track | null;
  plan: Plan;
  joined: Date;
  sessions: number;
  progress: number;
  lastActiveAt: Date;
  status: MemberStatus;
};

export async function getRoster(filter: RosterFilter): Promise<RosterRow[]> {
  const users = await prisma.user.findMany({
    where: {
      role: "MEMBER",
      ...(filter.name ? { name: { contains: filter.name } } : {}),
      ...(filter.track ? { track: filter.track } : {}),
      ...(filter.plan ? { plan: filter.plan } : {}),
      ...(filter.ageMin !== undefined || filter.ageMax !== undefined
        ? {
            age: {
              ...(filter.ageMin !== undefined ? { gte: filter.ageMin } : {}),
              ...(filter.ageMax !== undefined ? { lte: filter.ageMax } : {}),
            },
          }
        : {}),
    },
    include: { progress: true },
    orderBy: { name: "asc" },
  });

  const now = new Date();
  return users.map((user) => {
    const sessions = user.progress.filter((p) => p.percent > 0).length;
    const averageProgress =
      user.progress.length > 0
        ? Math.round(user.progress.reduce((s, p) => s + p.percent, 0) / user.progress.length)
        : 0;

    return {
      id: user.id,
      name: user.name ?? user.email,
      email: user.email,
      age: user.age,
      track: (user.track as Track | null) ?? null,
      plan: user.plan as Plan,
      joined: user.createdAt,
      sessions,
      progress: averageProgress,
      lastActiveAt: user.lastActiveAt,
      status: deriveMemberStatus({ lastActiveAt: user.lastActiveAt, averageProgress }, now),
    };
  });
}

export type ReportSummary = {
  totalMembers: number;
  activeThisWeek: number;
  averageProgress: number;
  retention30: number;
  signupsByMonth: { month: string; count: number }[];
};

export async function getReportSummary(): Promise<ReportSummary> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const thirtyAgo = new Date(now.getTime() - 30 * 86_400_000);
  const sixtyAgo = new Date(now.getTime() - 60 * 86_400_000);

  const [totalMembers, activeThisWeek, progressAgg, members] = await Promise.all([
    prisma.user.count({ where: { role: "MEMBER" } }),
    prisma.user.count({ where: { role: "MEMBER", lastActiveAt: { gte: weekAgo } } }),
    prisma.progress.aggregate({ _avg: { percent: true } }),
    prisma.user.findMany({
      where: { role: "MEMBER" },
      select: { createdAt: true, lastActiveAt: true },
    }),
  ]);

  // 30-day retention cohort: of the members who joined between 60 and 30 days
  // ago, what share were active in the last 30 days?
  const cohort = members.filter((m) => m.createdAt >= sixtyAgo && m.createdAt < thirtyAgo);
  const retained = cohort.filter((m) => m.lastActiveAt >= thirtyAgo);
  const retention30 = cohort.length > 0 ? Math.round((retained.length / cohort.length) * 100) : 0;

  // Signups per month over the last 8 months.
  const signupsByMonth: { month: string; count: number }[] = [];
  for (let i = 7; i >= 0; i -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    signupsByMonth.push({
      month: start.toLocaleString("en-US", { month: "short" }),
      count: members.filter((m) => m.createdAt >= start && m.createdAt < end).length,
    });
  }

  return {
    totalMembers,
    activeThisWeek,
    averageProgress: Math.round(progressAgg._avg.percent ?? 0),
    retention30,
    signupsByMonth,
  };
}

export async function getAdminCatalog() {
  const videos = await prisma.video.findMany({
    include: videoInclude,
    orderBy: [{ createdAt: "desc" }],
  });
  return videos.map((v) => ({
    id: v.id,
    title: v.title,
    categoryName: v.category.name,
    masterName: v.master?.name ?? null,
    levelName: v.level?.name ?? null,
    durationLabel: formatDuration(v.duration),
    access: v.access as AccessLevel,
    status: v.status as VideoStatus,
  }));
}

/** Everything the video edit screen needs: fields, syllabus, transcript. */
export async function getVideoForEdit(videoId: string) {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: { _count: { select: { completions: true } } },
          },
        },
      },
      transcriptLines: { orderBy: { startSeconds: "asc" } },
      _count: { select: { progress: true, savedBy: true, notifications: true } },
    },
  });
  if (!video) return null;

  return {
    id: video.id,
    title: video.title,
    slug: video.slug,
    summary: video.summary,
    categoryId: video.categoryId,
    masterId: video.masterId,
    levelId: video.levelId,
    access: video.access as AccessLevel,
    status: video.status as VideoStatus,
    intensity: video.intensity as Intensity,
    stance: video.stance as Stance,
    durationMinutes: Math.round(video.duration / 60),
    sourceUrl: video.sourceUrl,
    muxPlaybackId: video.muxPlaybackId,
    createdAt: video.createdAt,
    publishedAt: video.publishedAt,
    counts: video._count,
    chapters: video.chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      lessons: chapter.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        durationMinutes: Math.round(lesson.duration / 60),
        completions: lesson._count.completions,
      })),
    })),
    /** Serialised for the bulk transcript editor as `m:ss  text`. */
    transcriptText: serializeTranscript(video.transcriptLines),
  };
}

export type VideoForEdit = NonNullable<Awaited<ReturnType<typeof getVideoForEdit>>>;

/**
 * Member detail for the admin console. Read-only: v1 has no destructive member
 * actions (spec §6.11), and health answers are shown because staff need them to
 * support the member — hence the confidentiality notice on the page.
 */
export async function getMemberDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      healthAnswers: true,
      progress: { include: { video: { include: videoInclude } }, orderBy: { updatedAt: "desc" } },
      follows: { include: { category: true, master: true, level: true } },
      moodCheckIns: { orderBy: { createdAt: "desc" }, take: 10 },
      savedVideos: { include: { video: true } },
      notifications: { include: { video: true }, orderBy: { createdAt: "desc" }, take: 10 },
      lessonCompletions: { include: { lesson: true } },
    },
  });
  if (!user || user.role !== "MEMBER") return null;

  const averageProgress =
    user.progress.length > 0
      ? Math.round(user.progress.reduce((sum, p) => sum + p.percent, 0) / user.progress.length)
      : 0;

  return {
    id: user.id,
    name: user.name ?? user.email,
    email: user.email,
    age: user.age,
    plan: user.plan as Plan,
    track: (user.track as Track | null) ?? null,
    createdAt: user.createdAt,
    lastActiveAt: user.lastActiveAt,
    status: deriveMemberStatus({ lastActiveAt: user.lastActiveAt, averageProgress }),
    averageProgress,
    totalMinutes: Math.round(
      user.progress.reduce((sum, p) => sum + p.secondsWatched, 0) / 60,
    ),
    sessions: user.progress.filter((p) => p.percent > 0).length,
    lessonsComplete: user.lessonCompletions.length,
    streak: computeStreak(user.progress.map((p) => p.updatedAt)),
    healthAnswers: user.healthAnswers,
    progress: user.progress.map((row) => ({
      id: row.id,
      title: row.video.title,
      slug: row.video.slug,
      categoryName: row.video.category.name,
      percent: row.percent,
      minutes: Math.round(row.secondsWatched / 60),
      updatedAt: row.updatedAt,
    })),
    follows: user.follows.map((follow) => ({
      id: follow.id,
      kind: follow.kind,
      label:
        follow.category?.name ??
        (follow.master ? `Master ${follow.master.name}` : (follow.level?.name ?? "—")),
    })),
    saved: user.savedVideos.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.video.title,
    })),
    moods: user.moodCheckIns.map((row) => ({
      id: row.id,
      score: row.score,
      createdAt: row.createdAt,
    })),
    notifications: user.notifications.map((row) => ({
      id: row.id,
      title: row.video.title,
      reason: row.reason,
      read: row.read,
      createdAt: row.createdAt,
    })),
  };
}

export type MemberDetail = NonNullable<Awaited<ReturnType<typeof getMemberDetail>>>;

/** Reference data and marketing content, with usage counts for delete guards. */
export async function getContentLists() {
  const [categories, masters, posts, team] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { videos: true, follows: true } } },
    }),
    prisma.master.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { videos: true, follows: true } } },
    }),
    prisma.blogPost.findMany({ orderBy: { publishedAt: "desc" } }),
    prisma.teamMember.findMany({ orderBy: { order: "asc" } }),
  ]);

  return { categories, masters, posts, team };
}

export async function getLevelsWithVideos() {
  const [levels, videos] = await Promise.all([
    prisma.level.findMany({
      orderBy: { order: "asc" },
      include: { videos: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.video.findMany({ orderBy: { title: "asc" } }),
  ]);

  return {
    levels: levels.map((level, index) => ({
      id: level.id,
      name: level.name,
      description: level.description,
      order: level.order,
      badge: `LVL ${index}`,
      videos: level.videos.map((v) => ({
        id: v.id,
        title: v.title,
        durationLabel: formatDuration(v.duration),
      })),
    })),
    allVideos: videos.map((v) => ({
      id: v.id,
      title: v.title,
      durationLabel: formatDuration(v.duration),
      levelId: v.levelId,
    })),
  };
}
