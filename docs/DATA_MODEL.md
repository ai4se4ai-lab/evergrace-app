# Data model

Source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma). This
implements spec §4, with two documented departures noted at the end.

## Entities

### Identity

**User** — one row per member and per staff account, distinguished by `role`.

| Field | Notes |
|---|---|
| `email` | Unique, lower-cased on write |
| `role` | `MEMBER` \| `ADMIN` |
| `plan` | `BASIC` \| `MEMBER` \| `PREMIUM`. Written **only** by the billing layer. |
| `track` | `SEATED` \| `SUPPORTED` \| `ACTIVE`, or null before the check-in |
| `passwordHash` | bcrypt; admins only. Members are passwordless. |
| `preferences` | JSON string of the accessibility panel state |
| `stripeCustomerId`, `stripeSubscriptionId` | Set by the Stripe webhook |
| `lastActiveAt` | Touched on progress, mood, and lesson writes. Feeds member status. |

**Session** — database-backed sessions. `sessionToken` stores a SHA-256 hash of
the cookie value, never the value itself.

**MagicLinkToken** — single-use passwordless sign-in. Hashed like sessions,
20-minute expiry, `usedAt` stamped on consumption.

**HealthCheckIn** — one per user (`userId` is unique). Stores the four raw
answers *and* `computedTrack`, so a later change to the scoring rule doesn't
silently rewrite history — the original answers can be rescored.

### Catalog

**Category** (Balance, Breathing, Joint health, Safety) · **Master** (instructor)
· **Level** (ordered progression rung, `order` 0..n).

**Video** — the central content row.

| Field | Notes |
|---|---|
| `slug` | Unique, URL-facing. `/library/[videoId]` accepts a slug or an id. |
| `categoryId` | Required |
| `masterId`, `levelId` | Optional. A video belongs to at most one level. |
| `intensity` | `GENTLE` \| `MODERATE` |
| `stance` | `SEATED` \| `SUPPORTED` \| `FREE_STANDING` |
| `duration` | Seconds |
| `access` | `FREE` \| `MEMBERS` \| `PREMIUM` |
| `status` | `DRAFT` \| `PROCESSING` \| `PUBLISHED` |
| `muxAssetId`, `muxPlaybackId` | Set by the Mux webhook |
| `sourceUrl` | MVP fallback for direct playback without Mux |
| `publishedAt` | Stamped on first publish; kept on later status changes |

**Chapter → Lesson** — the syllabus, both ordered by `order`. **TranscriptLine** —
`startSeconds` + `text`, driving the clickable transcript.

### Member activity

| Model | Key | Purpose |
|---|---|---|
| `Progress` | unique `(userId, videoId)` | `secondsWatched` + `percent`. Never decreases. |
| `LessonCompletion` | unique `(userId, lessonId)` | Syllabus ticks |
| `SavedVideo` | unique `(userId, videoId, kind)` | `kind` = `subscribed` \| `liked` \| `favorite` → My Library tabs |
| `Follow` | unique `(userId, kind, categoryId, masterId, levelId)` | Drives "New for you" and notifications |
| `Notification` | — | `videoId` + `reason` + `read` |
| `MoodCheckIn` | — | Score 1–5, one row per check-in (a history, not a snapshot) |

### Marketing

**BlogPost** (slug-addressed, statically generated) and **TeamMember** (ordered).
Landing-page copy — hero, features, testimonials, pillars — lives in
`src/content/site.ts` instead, because it is versioned with the design rather
than edited by staff. The spec permits either (§6.1).

## Derived values — computed, never stored

| Value | Rule | Where |
|---|---|---|
| Member status | `INACTIVE` if inactive > 14 days; `AT_RISK` if > 7 days **or** avg progress < 25%; else `ACTIVE` | `deriveMemberStatus` |
| Streak | Consecutive days with activity, ending today or yesterday | `computeStreak` |
| Minutes this month | Σ `secondsWatched` for rows updated since the 1st | `getDashboardData` |
| Weekly minutes | Σ per 7-day bucket, last 8 buckets | `buildWeeklyMinutes` |
| Focus breakdown | Σ `secondsWatched` grouped by category, as a percentage | `getDashboardData` |
| 30-day retention | Of members who joined 60–30 days ago, the share active in the last 30 | `getReportSummary` |
| `canView` | `planRank(plan) >= accessRank(access)` | `canView` |

The spec is explicit that member status must not be a stored column, and it
isn't: the nightly cron reports the distribution and prunes expired rows, but
writes nothing to `User`.

## Referential integrity

Everything hanging off a user or a video cascades on delete
(`onDelete: Cascade`) — sessions, progress, follows, notifications, saved
videos, chapters, lessons, transcript lines. Deleting a `Level` does **not**
delete its videos: `deleteLevel` first nulls `Video.levelId`, then closes the gap
in `order` so the LVL badges stay contiguous.

## Indexes

`User.lastActiveAt` (status queries), `Video(status, createdAt)` (catalog and
"New for you"), `Video.categoryId`, `Chapter(videoId, order)`,
`Lesson(chapterId, order)`, `TranscriptLine(videoId, startSeconds)`,
`Progress(userId, updatedAt)`, `Notification(userId, read)` (unread count),
`Follow.userId`, `MoodCheckIn(userId, createdAt)`.

## Two documented departures from spec §4

1. **SQLite instead of PostgreSQL**, so the app runs with no infrastructure.
   SQLite has no enum type, so every field the spec declares as an enum is a
   `String` whose permitted values are defined once in `src/lib/domain.ts` and
   validated with Zod at every write. Column names and value strings are exactly
   the spec's. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the Postgres migration.
2. **Added fields**, all additive: `User.passwordHash` and `User.preferences`,
   `Video.slug` / `summary` / `sourceUrl` / `publishedAt`, `Category.blurb`,
   `TeamMember.initials`, plus the `Session` and `MagicLinkToken` models the
   spec implies through `User.sessions` and its magic-link flow.
