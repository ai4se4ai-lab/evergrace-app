/**
 * Domain vocabulary and business rules — PROJECT_SPEC.md §2 and §6.
 *
 * This module is the single source of truth for every rule the prototype
 * encoded in `renderVals()` (`computeTier`, `planRank`, `accessRank`,
 * `canView`, member-status derivation). It has no imports from Prisma, React,
 * or Next so it can be unit-tested directly (see src/lib/domain.test.ts) and
 * imported from both server and client components.
 */

// ---------------------------------------------------------------------------
// Enumerations (stored as strings — see the provider note in schema.prisma)
// ---------------------------------------------------------------------------

export const PLANS = ["BASIC", "MEMBER", "PREMIUM"] as const;
export type Plan = (typeof PLANS)[number];

export const ACCESS_LEVELS = ["FREE", "MEMBERS", "PREMIUM"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

export const VIDEO_STATUSES = ["DRAFT", "PROCESSING", "PUBLISHED"] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const TRACKS = ["SEATED", "SUPPORTED", "ACTIVE"] as const;
export type Track = (typeof TRACKS)[number];

export const MEMBER_STATUSES = ["ACTIVE", "AT_RISK", "INACTIVE"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const ROLES = ["MEMBER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const FOLLOW_KINDS = ["CATEGORY", "MASTER", "LEVEL"] as const;
export type FollowKind = (typeof FOLLOW_KINDS)[number];

export const INTENSITIES = ["GENTLE", "MODERATE"] as const;
export type Intensity = (typeof INTENSITIES)[number];

export const STANCES = ["SEATED", "SUPPORTED", "FREE_STANDING"] as const;
export type Stance = (typeof STANCES)[number];

export const SAVED_KINDS = ["subscribed", "liked", "favorite"] as const;
export type SavedKind = (typeof SAVED_KINDS)[number];

// ---------------------------------------------------------------------------
// Access control — the prototype's planRank / accessRank / canView
// ---------------------------------------------------------------------------

const PLAN_RANK: Record<Plan, number> = { BASIC: 0, MEMBER: 1, PREMIUM: 2 };
const ACCESS_RANK: Record<AccessLevel, number> = { FREE: 0, MEMBERS: 1, PREMIUM: 2 };

export function planRank(plan: Plan | null | undefined): number {
  return plan ? (PLAN_RANK[plan] ?? 0) : 0;
}

export function accessRank(access: AccessLevel | null | undefined): number {
  return access ? (ACCESS_RANK[access] ?? 0) : 0;
}

/**
 * Basic sees Free; Member sees Free + Members; Premium sees everything.
 * A signed-out visitor is treated as BASIC — they may browse, and Free videos
 * play, but anything above Free is locked.
 */
export function canView(
  video: { access: AccessLevel },
  viewer: { plan: Plan; role?: Role } | null | undefined,
): boolean {
  if (viewer?.role === "ADMIN") return true;
  return planRank(viewer?.plan ?? "BASIC") >= accessRank(video.access);
}

/** The lowest plan that unlocks a given access level. */
export function requiredPlanFor(access: AccessLevel): Plan {
  if (access === "PREMIUM") return "PREMIUM";
  if (access === "MEMBERS") return "MEMBER";
  return "BASIC";
}

/** Following masters and levels is a paid feature (spec §6.5). */
export function canFollow(plan: Plan): boolean {
  return planRank(plan) >= planRank("MEMBER");
}

// ---------------------------------------------------------------------------
// Health check-in — the prototype's computeTier(), rule-for-rule (spec §6.2)
// ---------------------------------------------------------------------------

export type HealthAnswers = {
  mobility: "seated" | "supported" | "free";
  surgery: "yes" | "no";
  dizzy: "often" | "sometimes" | "rarely";
  joints: "significant" | "little" | "none";
};

export function computeTrack(a: HealthAnswers): Track {
  if (a.surgery === "yes" || a.dizzy === "often" || a.mobility === "seated") {
    return "SEATED";
  }
  if (
    a.mobility === "supported" ||
    a.dizzy === "sometimes" ||
    a.joints === "significant" ||
    a.joints === "little"
  ) {
    return "SUPPORTED";
  }
  return "ACTIVE";
}

/** The stances a member on a given track should be offered by default. */
export function stancesForTrack(track: Track): Stance[] {
  if (track === "SEATED") return ["SEATED"];
  if (track === "SUPPORTED") return ["SEATED", "SUPPORTED"];
  return ["SEATED", "SUPPORTED", "FREE_STANDING"];
}

// ---------------------------------------------------------------------------
// Member status — derived, never stored (spec §6.9)
// ---------------------------------------------------------------------------

export const AT_RISK_AFTER_DAYS = 7;
export const INACTIVE_AFTER_DAYS = 14;
export const AT_RISK_PROGRESS_THRESHOLD = 25;

export function deriveMemberStatus(
  member: { lastActiveAt: Date; averageProgress: number },
  now: Date = new Date(),
): MemberStatus {
  const days = daysBetween(member.lastActiveAt, now);
  if (days > INACTIVE_AFTER_DAYS) return "INACTIVE";
  if (days > AT_RISK_AFTER_DAYS) return "AT_RISK";
  if (member.averageProgress < AT_RISK_PROGRESS_THRESHOLD) return "AT_RISK";
  return "ACTIVE";
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export function progressPercent(secondsWatched: number, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0;
  return clamp(Math.round((secondsWatched / durationSeconds) * 100), 0, 100);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * A practice "streak" is the number of consecutive days ending today (or
 * yesterday, so an evening practitioner doesn't lose the streak overnight)
 * on which the member recorded any activity.
 */
export function computeStreak(activityDates: Date[], now: Date = new Date()): number {
  const days = new Set(activityDates.map(toDayKey));
  if (days.size === 0) return 0;

  const todayKey = toDayKey(now);
  const cursor = new Date(now);
  if (!days.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(toDayKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(toDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// ---------------------------------------------------------------------------
// Notification reason strings — built exactly as the prototype did (§6.8)
// ---------------------------------------------------------------------------

export function categoryReason(categoryName: string): string {
  return `New in ${categoryName}`;
}

export function masterReason(masterName: string): string {
  return `New from Master ${masterName}`;
}

export function levelReason(levelName: string): string {
  return `New in ${levelName}`;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export const PLAN_LABEL: Record<Plan, string> = {
  BASIC: "Basic",
  MEMBER: "Member",
  PREMIUM: "Premium",
};

export const ACCESS_LABEL: Record<AccessLevel, string> = {
  FREE: "Free",
  MEMBERS: "Members",
  PREMIUM: "Premium",
};

export const TRACK_LABEL: Record<Track, string> = {
  SEATED: "Seated",
  SUPPORTED: "Supported",
  ACTIVE: "Active",
};

export const STATUS_LABEL: Record<VideoStatus, string> = {
  DRAFT: "Draft",
  PROCESSING: "Processing",
  PUBLISHED: "Published",
};

export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  ACTIVE: "Active",
  AT_RISK: "At risk",
  INACTIVE: "Inactive",
};

export const INTENSITY_LABEL: Record<Intensity, string> = {
  GENTLE: "Gentle",
  MODERATE: "Moderate",
};

export const STANCE_LABEL: Record<Stance, string> = {
  SEATED: "Seated",
  SUPPORTED: "Supported",
  FREE_STANDING: "Free standing",
};

export const TRACK_DESCRIPTION: Record<Track, string> = {
  SEATED:
    "You’ll begin with calming, seated movements that build balance and confidence safely from your chair.",
  SUPPORTED:
    "You’ll practice standing movements with a wall or chair nearby for steady, secure support.",
  ACTIVE:
    "You’re ready for free-standing practice. We’ll still keep every movement slow, gentle, and controlled.",
};

// Price, perks, and unlocks copy for each plan are DB-backed — see
// getPlanCatalog() in ./queries.ts. Only the enum→label map stays static
// here, alongside the other display-label maps below.

export const MOOD_LABEL: Record<number, string> = {
  1: "Stiff and tired — we’ll keep it very gentle today.",
  2: "A little low — easy does it.",
  3: "Feeling okay — a good day to move.",
  4: "Feeling good — nicely warmed up.",
  5: "Strong and ready — wonderful!",
};

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

export function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function relativeTime(date: Date, now: Date = new Date()): string {
  const mins = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

/** "Today" / "Yesterday" / "N days ago" — the admin roster's last-active column. */
export function lastActiveLabel(date: Date, now: Date = new Date()): string {
  const days = daysBetween(date, now);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
