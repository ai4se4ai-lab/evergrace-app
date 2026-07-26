# Senior Martial Arts Platform — Build Spec

This document is the source-of-truth spec for a code generator (or an engineering
team) to implement a **fully functional, production-grade** version of the
prototype described in `Complete Feature Guide` and mocked up in the supplied
single-file DC/HTML prototype. The prototype is a static, in-memory UI mock —
this spec turns it into a real, persisted, multi-user web application.

Read this top to bottom before generating code. Section 8 ("Build Order") is the
recommended implementation sequence.

---

## 1. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 14+ (App Router)**, TypeScript everywhere | Server Components by default; Client Components only where interactive |
| Styling | **Tailwind CSS** + CSS variables for theming | Reuse the design tokens in §3 exactly (light / dark / high-contrast) |
| UI primitives | **shadcn/ui** (Radix-based) | Accessible by default; matches the accessibility requirements in §9 |
| Database | **PostgreSQL 15+** | Hosted on Supabase, Neon, or RDS — any standard Postgres |
| ORM | **Prisma** | Schema in §4; use Prisma Migrate for versioned migrations |
| Auth | **NextAuth.js (Auth.js) v5** with the **Email (magic link)** provider for members, and **Credentials provider** for admin staff | Matches "no password" member flow + admin email/password flow in the prototype |
| Email delivery | **Resend** (or Postmark) | Sends magic links + notification emails |
| Payments / subscriptions | **Stripe** (Checkout + Billing Portal + Webhooks) | Drives the Basic / Member / Premium plan tiers |
| Video hosting & processing | **Mux Video** | Prototype explicitly says "sent to Mux for processing"; use Mux for upload, encoding, thumbnails, and playback (Mux Player) |
| Server state / data fetching | **Server Components + Server Actions** for mutations, **TanStack Query** for client-side polling (e.g. notification bell) | |
| Forms & validation | **React Hook Form** + **Zod** (shared schemas between client and server) | |
| Charts | **Recharts** | Practice-minutes line chart, focus-area donut, admin signups bar chart |
| File/image handling | **Vercel Blob** or **S3** for team photos, blog thumbnails | |
| Background jobs | **Inngest** or **Vercel Cron** | Mux webhook processing, notification fan-out, nightly "at risk" status recompute |
| Testing | **Vitest** (unit), **Playwright** (e2e), **@testing-library/react** (component) | |
| Deployment | **Vercel** (app) + managed Postgres | |
| Observability | **Sentry** (errors) + **Vercel Analytics** | |

Package manager: **pnpm**. Monorepo not required — a single Next.js app is sufficient.

---

## 2. Domain Glossary

These terms recur throughout the spec and must be named identically in code
(variables, DB columns, API routes) to avoid drift:

- **Plan** — a member's subscription tier: `BASIC` (free) → `MEMBER` ($9/mo) → `PREMIUM` ($19/mo). Ordinal rank 0/1/2.
- **Access level** — a tag on a video: `FREE` → `MEMBERS` → `PREMIUM`. Ordinal rank 0/1/2.
- **canView(video, member)** — `planRank(member.plan) >= accessRank(video.access)`.
- **Track** — the health-check-in outcome: `SEATED`, `SUPPORTED`, `ACTIVE`.
- **Category** — a focus area: Balance, Breathing, Joint health, Safety (+ "Seated fundamentals" as a filter, not a stored category).
- **Master** — an instructor (Ken Ryu, Aiko Tanaka, Mei Lin, ...).
- **Level** — an ordered skill-progression grouping of videos (Level 0, 1, 2, ...), distinct from Category.
- **Subscription (follow)** — a member "follows" a Category, a Master, or a Level; this drives Notifications and "New for you".
- **Status** (video) — `DRAFT`, `PROCESSING`, `PUBLISHED`.
- **Member status** (admin roster) — `ACTIVE`, `AT_RISK`, `INACTIVE` — computed, not manually set (see §6.9).

---

## 3. Design Tokens (carry over exactly from the prototype)

The prototype already encodes a deliberate, senior-friendly visual identity.
Preserve it — do not restyle from scratch.

```css
/* Light (default) */
--bg: #f2ece0;        --surface: #fbf8f2;      --fg: #2c2824;
--muted: #6b635a;      --line: #ddd4c6;
--accent: #2a6fb0;     --accent-dark: #1f5a92;  --accent-soft: #e6eef6;
--success: #3f7d5c;    --success-soft: #e2efe8;

/* Dark */
--bg: #201d1a;         --surface: #2b2723;      --fg: #f0ebe3;
--muted: #a89f92;       --line: #3d3833;
--accent: #5b9bd8;      --accent-dark: #8fbde6;  --accent-soft: #2f3a45;
--success: #6cbf92;     --success-soft: #26362d;

/* High contrast (overrides either mode) */
--bg: #ffffff; --surface: #ffffff; --fg: #000000; --muted: #333333;
--line: #000000; --accent: #004a99; --accent-dark: #003570;
```

- **Display / UI font:** `Baloo 2` (500–800 weights) for headings and buttons.
- **Body font:** `Public Sans` (400–700, plus italic 400) for paragraphs.
- Base font size is user-adjustable: **16px / 20px / 24px** (Small/Medium/Large), applied at the root so every `rem`/`em` value scales.
- Minimum interactive target height: **44px**, most primary buttons use **52–64px**.
- Border radius scale: 8–12px small controls, 14–24px cards/modals, 50% pills/avatars.
- Respect `prefers-reduced-motion`; all transitions must have a reduced-motion fallback.

Implement tokens as CSS variables on `:root`/`[data-theme]`/`[data-contrast]`, wired into `tailwind.config.ts` via `hsl(var(--x))`-style indirection so Tailwind utility classes (`bg-surface`, `text-muted`, etc.) work directly.

---

## 4. Data Model (Prisma schema, abbreviated)

```prisma
enum Plan            { BASIC MEMBER PREMIUM }
enum AccessLevel      { FREE MEMBERS PREMIUM }
enum VideoStatus       { DRAFT PROCESSING PUBLISHED }
enum Track             { SEATED SUPPORTED ACTIVE }
enum MemberStatus      { ACTIVE AT_RISK INACTIVE }
enum Role              { MEMBER ADMIN }
enum FollowKind        { CATEGORY MASTER LEVEL }
enum Intensity         { GENTLE MODERATE }
enum Stance             { SEATED SUPPORTED FREE_STANDING }

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  role          Role     @default(MEMBER)
  name          String?
  age           Int?
  plan          Plan     @default(BASIC)
  stripeCustomerId     String?
  stripeSubscriptionId String?
  track         Track?                     // result of health check-in
  createdAt     DateTime @default(now())
  lastActiveAt  DateTime @default(now())

  healthAnswers     HealthCheckIn?
  progress          Progress[]
  follows           Follow[]
  notifications     Notification[]
  moodCheckIns      MoodCheckIn[]
  savedVideos       SavedVideo[]
  sessions          Session[]
}

model HealthCheckIn {
  id         String  @id @default(cuid())
  userId     String  @unique
  user       User    @relation(fields: [userId], references: [id])
  mobility   String  // seated | supported | free
  surgery    String  // yes | no
  dizzy      String  // often | sometimes | rarely
  joints     String  // significant | little | none
  computedTrack Track
  answeredAt DateTime @default(now())
}

model Category {
  id    String @id @default(cuid())
  name  String @unique       // Balance, Breathing, Joint health, Safety
  videos Video[]
  follows Follow[]
}

model Master {
  id    String @id @default(cuid())
  name  String @unique
  style String?
  videos Video[]
  follows Follow[]
}

model Level {
  id          String  @id @default(cuid())
  order       Int
  name        String
  description String
  videos      Video[]
  follows     Follow[]
}

model Video {
  id          String       @id @default(cuid())
  title       String
  categoryId  String
  category    Category     @relation(fields: [categoryId], references: [id])
  masterId    String?
  master      Master?      @relation(fields: [masterId], references: [id])
  levelId     String?
  level       Level?       @relation(fields: [levelId], references: [id])
  intensity   Intensity
  stance      Stance
  duration    Int          // seconds
  access      AccessLevel  @default(FREE)
  status      VideoStatus  @default(DRAFT)
  muxAssetId  String?
  muxPlaybackId String?
  thumbnailUrl  String?
  chapters    Chapter[]
  transcriptLines TranscriptLine[]
  progress    Progress[]
  savedBy     SavedVideo[]
  notifications Notification[]
  createdAt   DateTime @default(now())
}

model Chapter {
  id       String  @id @default(cuid())
  videoId  String
  video    Video   @relation(fields: [videoId], references: [id])
  title    String
  order    Int
  lessons  Lesson[]
}

model Lesson {
  id         String  @id @default(cuid())
  chapterId  String
  chapter    Chapter @relation(fields: [chapterId], references: [id])
  title      String
  duration   Int
  order      Int
  completions LessonCompletion[]
}

model LessonCompletion {
  id       String @id @default(cuid())
  userId   String
  lessonId String
  user     User   @relation(fields: [userId], references: [id])
  lesson   Lesson @relation(fields: [lessonId], references: [id])
  completedAt DateTime @default(now())
  @@unique([userId, lessonId])
}

model TranscriptLine {
  id         String @id @default(cuid())
  videoId    String
  video      Video  @relation(fields: [videoId], references: [id])
  startSeconds Int
  text       String
}

model Progress {
  id            String   @id @default(cuid())
  userId        String
  videoId       String
  user          User     @relation(fields: [userId], references: [id])
  video         Video    @relation(fields: [videoId], references: [id])
  secondsWatched Int      @default(0)
  percent       Int       @default(0)
  updatedAt     DateTime  @updatedAt
  @@unique([userId, videoId])
}

model SavedVideo {
  id       String   @id @default(cuid())
  userId   String
  videoId  String
  user     User     @relation(fields: [userId], references: [id])
  video    Video    @relation(fields: [videoId], references: [id])
  kind     String   // subscribed | liked | favorite
  createdAt DateTime @default(now())
  @@unique([userId, videoId, kind])
}

model Follow {
  id         String     @id @default(cuid())
  userId     String
  user       User       @relation(fields: [userId], references: [id])
  kind       FollowKind
  categoryId String?
  category   Category?  @relation(fields: [categoryId], references: [id])
  masterId   String?
  master     Master?    @relation(fields: [masterId], references: [id])
  levelId    String?
  level      Level?     @relation(fields: [levelId], references: [id])
  createdAt  DateTime   @default(now())
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  videoId   String
  video     Video    @relation(fields: [videoId], references: [id])
  reason    String   // e.g. "New from Master Ken Ryu"
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}

model MoodCheckIn {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  score     Int      // 1-5
  createdAt DateTime @default(now())
}

model BlogPost {
  id        String   @id @default(cuid())
  title     String
  slug      String   @unique
  category  String
  excerpt   String
  body      String
  thumbnailUrl String?
  publishedAt DateTime @default(now())
  readMinutes Int
}

model TeamMember {
  id     String @id @default(cuid())
  name   String
  role   String
  bio    String
  photoUrl String?
  order  Int
}
```

Notes:
- `Progress.percent` drives both the "My Library" progress bars and the dashboard
  "practice minutes" chart (aggregate `secondsWatched` per ISO week).
- A video's `AT_RISK` / `INACTIVE` **member** status is *derived*, not stored on
  `User` — compute it in a query/materialized view from `lastActiveAt` (see §6.9).
- `Level.order` and `Chapter.order` / `Lesson.order` give deterministic sequencing.

---

## 5. Route Map (Next.js App Router)

```
/                          → Landing (public)
/onboarding                → Health check-in wizard (public → creates draft profile)
/login                     → Member magic-link sign-in
/admin/login               → Admin credentials sign-in
/dashboard                 → Member home (auth required)
/library                   → Video catalog (public browse; locked cards prompt login/upgrade)
/library/[videoId]         → Video player + transcript + syllabus
/about                     → About us (public)
/blog                      → Blog index (public)
/blog/[slug]                → Blog post (public)
/account                    → Plan management, billing portal link
/api/auth/[...nextauth]     → NextAuth handlers
/api/stripe/webhook         → Stripe billing webhook
/api/mux/webhook            → Mux asset-ready webhook
/api/checkin                → POST health check-in answers
/api/mood                   → POST daily mood
/api/follow                 → POST/DELETE a follow (category/master/level)
/api/notifications          → GET list, PATCH mark-read
/api/progress                → PATCH video watch progress

/admin                       → redirect to /admin/reports
/admin/reports                → Reports & Impact
/admin/videos                → Catalog + Skill Levels sub-tabs
/admin/videos/upload          → Upload flow (Mux direct upload)
/admin/videos/levels           → Skill level builder
/admin/users                  → Member roster + filters + PDF export
```

Auth boundaries:
- `/dashboard`, `/account`, `/library/[id]` playback of non-Free videos, `/api/*`
  mutation routes → require a signed-in `MEMBER` (or `ADMIN`) session.
- `/admin/**` → require `role = ADMIN`, enforced in `middleware.ts` and re-checked
  server-side in every admin Server Action (never trust the client).

---

## 6. Feature-by-Feature Implementation Notes

### 6.1 Landing page
Server Component, statically generated content (features, testimonials) pulled
from seed data / CMS table. Carousel is a small Client Component
(`<FeatureCarousel client:load>` equivalent) with autoplay (5s), pause on hover,
dot navigation, and prev/next — reduced-motion users get autoplay disabled.

### 6.2 Health check-in wizard
Client Component with local wizard state (welcome → 4 questions → result).
On submit, `POST /api/checkin`:
1. Computes `track` server-side using the same rule as the prototype's
   `computeTier()`:
   - `surgery === 'yes' || dizzy === 'often' || mobility === 'seated'` → `SEATED`
   - else `mobility === 'supported' || dizzy === 'sometimes' || joints in {significant, little}` → `SUPPORTED`
   - else → `ACTIVE`
2. Persists `HealthCheckIn` + updates `User.track`.
3. If no session exists yet, the result screen collects an email and creates the
   account + fires the magic link (NextAuth `signIn('email', ...)`), then
   redirects to `/dashboard` once verified.

### 6.3 Auth
- Members: **passwordless email magic link** only (no password field, matches
  prototype copy "no passwords to remember").
- Admins: **email + password** (bcrypt-hashed, seeded via a secure admin
  invite flow — never a public sign-up).
- Session strategy: database sessions (Prisma adapter) so admin role changes
  and plan changes take effect immediately without waiting for JWT refresh.

### 6.4 Dashboard
Server Component composing:
- Stat cards (streak, minutes this month, sessions done, lessons complete) —
  computed via aggregate queries over `Progress` / `LessonCompletion`.
- Practice-minutes line chart & focus-area donut — Recharts, fed by a
  server-computed weekly aggregation (last 8 ISO weeks) and per-category sums.
- "Today's suggested session" — first incomplete video matching the member's
  `track`.
- Mood slider — Client Component, `POST /api/mood` on change (debounced).
- Access-level card + "Manage / upgrade plan" → opens the Plan modal (§6.6).
- Subscriptions manager (§6.5).
- "New for you" — videos whose category/master/level matches an active
  `Follow`, `status = PUBLISHED`, ordered by `createdAt desc`.
- My Library tabs (Subscribed / Liked / Favorites) — reads `SavedVideo`.

### 6.5 Subscriptions (follows)
Toggling a chip creates/deletes a `Follow` row (`kind` + one of
`categoryId`/`masterId`/`levelId`). Gated to `plan >= MEMBER` — Basic members
see the chips disabled with an upsell tooltip, consistent with the guide
("Available to Member and Premium plans").

### 6.6 Plan / upgrade modal
Presents the 3 plan cards. Selecting a paid plan starts a **Stripe Checkout**
session (`mode: 'subscription'`); selecting Basic (downgrade) redirects to the
**Stripe Billing Portal**. `Plan` on `User` is only ever changed by the Stripe
webhook handler (`checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`) — never optimistically by the client.
When opened from a locked video, pass `lockedVideoId` so the modal can show the
"🔒 *Title* is a *Tier* video" banner exactly as in the prototype.

### 6.7 Video library & player
- Library grid: server-rendered, filter chips are query-string driven
  (`/library?focus=Balance`), so filters are shareable/bookmarkable and SEO-safe.
- Card shows intensity / stance / focus / duration / access badge *before* the
  member presses play (per the guide's "no surprises" principle) — enforce this
  by never hiding those fields behind access checks.
- Player uses `@mux/mux-player-react`, wired to `Progress` via periodic
  `PATCH /api/progress` (every ~10s and on `pause`/`ended`).
- Interactive transcript: clicking a line calls `player.currentTime = line.startSeconds`.
- Syllabus panel: accordion of `Chapter → Lesson`; checking a lesson complete
  writes `LessonCompletion` and recomputes the chapter's `x of y complete` label.
- Locked video (access above the member's plan, or logged out) → do **not**
  serve the Mux playback URL; instead render the locked state and open the
  upgrade/login modal.

### 6.8 Notifications
- On admin video publish (`status → PUBLISHED`), a job (Inngest event or a
  transactional DB trigger + queue) fans out: for every `Follow` matching the
  video's category/master/level, insert a `Notification` with `reason` text
  built the same way as the prototype (e.g. `"New in " + category.name`,
  `"New from Master " + master.name`, or the level name).
- Bell icon: unread count via `useQuery` polling `/api/notifications` (or a
  Postgres `LISTEN/NOTIFY` + SSE upgrade later). "Mark all read" is a bulk
  `PATCH`.
- A locked notification shows "🔒 Upgrade to watch" exactly when
  `!canView(video, user)`.

### 6.9 Admin — Reports
- Stat cards: `COUNT(User)`, active-this-week (`lastActiveAt` within 7 days),
  average `Progress.percent`, 30-day retention cohort query.
- New-members-per-month bar chart: `GROUP BY date_trunc('month', createdAt)`
  over the last 8 months.
- Member status is **derived**, recomputed nightly (cron) or on read:
  - `INACTIVE` if `lastActiveAt` older than 14 days
  - `AT_RISK` if `lastActiveAt` older than 7 days or `Progress` average < 25%
  - otherwise `ACTIVE`
- Filters (name/track/plan/age range) are query-string driven; "Download PDF"
  renders a server-side PDF (e.g. `@react-pdf/renderer` or Puppeteer against a
  `/admin/reports/print` route) reflecting the exact filtered rows, and the
  print output must include the confidentiality footer used in the prototype
  ("Confidential — member health data. Handle per HIPAA / PIPEDA policy.").

### 6.10 Admin — Videos (Catalog / Upload / Skill Levels)
- Catalog table: inline `<select>` to change `access` per row → optimistic
  Server Action, revalidates `/admin/videos` and any public pages caching that
  video.
- Upload: client requests a Mux **direct upload URL** from the server
  (`POST /admin/videos/upload/mux-url`), uploads the file client-side straight
  to Mux, then creates a `Video` row with `status = PROCESSING` and the Mux
  upload/asset id. The `/api/mux/webhook` route listens for
  `video.asset.ready`, sets `status = PUBLISHED` (or leaves `DRAFT` if the
  admin unchecked "publish immediately"), stores `muxPlaybackId` +
  `thumbnailUrl`, and triggers the notification fan-out in §6.8.
- Skill Levels: CRUD screen for `Level` (name, description, ordered video
  list). Reordering levels/videos updates `order` via drag-and-drop
  (`@dnd-kit/core`) persisted through a Server Action.

### 6.11 Admin — Users
Same filter/table/PDF pattern as Reports, scoped to full roster columns
(track, plan, joined date, progress, status). No destructive actions in v1
(no delete-user button) — matches the prototype, which is read/export only.

---

## 7. Accessibility (non-negotiable, applies to every screen)

- Global **Accessibility panel** (header icon) controls, persisted per-user in
  a `preferences` JSON column on `User` (and a cookie for anonymous visitors):
  - Text size: 16 / 20 / 24px root font size.
  - High contrast: swaps the token set in §3.
  - Read aloud: uses the Web Speech API (`speechSynthesis`) to announce the
    current route's `<h1>` on navigation, toggled on/off.
  - Theme: Light / Dark / **Auto** (auto = `prefers-color-scheme`, live-updates
    via a `matchMedia` change listener).
- All interactive targets ≥ 44×44px (buttons in this design are 44–64px tall).
- Full keyboard navigation with a visible focus ring using `--accent`.
- `prefers-reduced-motion` disables carousel autoplay, hover-grow team cards,
  and modal entrance animation.
- Color is never the only signal (lock icons + text, not just red/green).
- WCAG 2.1 AA contrast minimum in every theme, AAA in high-contrast mode.

---

## 8. Recommended Build Order

1. **Scaffold**: Next.js + TypeScript + Tailwind + shadcn/ui; wire design tokens
   from §3 into `globals.css` + `tailwind.config.ts`. Build the static Landing,
   About, and Blog pages first (no auth needed) to validate the design system.
2. **Database + Auth**: Prisma schema (§4), migrations, seed script (categories,
   masters, levels, sample videos, blog posts, team members). NextAuth email +
   credentials providers, `middleware.ts` route protection.
3. **Health check-in → account creation** end-to-end.
4. **Video catalog & player** (read-only, seeded videos, no Mux upload yet) —
   `canView`/plan-gating logic, transcript, syllabus, progress tracking.
5. **Dashboard**: stats, charts, mood, my library, subscriptions, new-for-you.
6. **Notifications** fan-out + bell UI.
7. **Stripe billing**: Checkout, webhook, plan modal, account/billing page.
8. **Mux integration**: admin upload flow, webhook, replacing seeded video URLs.
9. **Admin console**: Reports, Users, Videos/Catalog, Skill Levels, PDF export.
10. **Accessibility pass + Playwright a11y & e2e suite** across all of the above.
11. **Polish**: empty states, loading skeletons, error boundaries, Sentry, analytics.

---

## 9. Environment Variables (`.env.example`)

```
DATABASE_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
EMAIL_SERVER=            # Resend/Postmark SMTP or API config
EMAIL_FROM=hello@steadypath.example
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_MEMBER=
STRIPE_PRICE_PREMIUM=
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
MUX_WEBHOOK_SECRET=
BLOB_READ_WRITE_TOKEN=   # or S3 credentials
SENTRY_DSN=
```

---

## 10. Out of Scope for v1

- Native mobile apps (responsive web only).
- Live/cohort classes (all content is on-demand video).
- Multi-language i18n (English only, structured so it can be added later).
- User-to-user messaging/social features beyond testimonials.

---

## Appendix — Source Material

- `Complete Feature Guide` (prose spec, supplied by the user) is the
  authoritative feature list; this document operationalizes it into an
  architecture.
- The supplied single-file DC/HTML prototype is the **UI/UX reference** for
  exact copy, layout, interaction states, and design tokens — treat its
  `renderVals()` logic (e.g. `computeTier`, `canView`, `accessBadgeStyle`) as
  the executable spec for business rules, ported into the Next.js/Prisma
  equivalents described above.
