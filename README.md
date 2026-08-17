# EverGrace — Senior-Friendly Martial Arts Platform

An accessible, multi-user web application for online martial-arts training built
for seniors. It pairs a warm, large-type **member experience** with a full
**admin console**, and ships with first-class accessibility controls (text
scaling, high contrast, read-aloud) and light / dark / auto theming throughout.

Built with **Next.js (App Router)**, TypeScript, Tailwind CSS, Prisma, and Radix
UI. The interface is a direct port of the interactive prototype in
[`index.html`](./index.html) — its copy, layout, design tokens, and business
rules are preserved rather than reinterpreted.

📖 **Full documentation lives in [`docs/`](./docs/README.md).**

---

## Getting started

The whole app — Postgres, migrations, and the Next.js server — runs from one
`docker-compose.yml`. No local Node or Postgres install required.

```bash
cp .env.example .env             # Windows: copy .env.example .env
docker compose build
docker compose up -d db app      # Postgres applies schema on first boot, then the server starts
docker compose run --rm tools npx tsx prisma/seed.ts   # reference data + demo roster
```

Then open **http://localhost:3000** (`curl http://localhost:3000/api/health`
to confirm readiness). Tear down with `docker compose down` (add `-v` to also
delete the seeded Postgres volume).

The `docker-compose.yml` defines `db` (Postgres 16, no host port published —
reachable only from other containers; schema comes from `database/init.sql`,
applied automatically the first time its volume initializes) and `app` (the
production build, published on `3000`). `tools` is a third, not started by
`up`, for one-off commands like seeding that need devDependencies `app`
doesn't ship. No API keys required; documented in-process fallbacks for
email, billing, and video hosting. Full details, including running without
Docker: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

### Without Docker

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run setup             # prisma generate + db push + seed
npm run dev               # http://localhost:3000
```

Requires your own Postgres instance — point `DATABASE_URL` at it, or
temporarily publish the `db` service's port from Docker Compose (see
[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)).

### Demo logins

| Who | How |
|---|---|
| **Staff / admin** | `/admin/login` → `admin@evergrace.example` / `EverGrace!Admin1` |
| **Premium member** | `/login` → `margaret-ellison@example.com` |
| **Basic member** | `/login` → `frank-alvarez@example.com` |
| **New member** | `/onboarding` → finish the check-in → any email |

Members sign in with a magic link and no password. Since no email provider is
configured locally, the link is printed to the dev-server terminal **and**
rendered as a button on the page — click it to sign in.

Signing in as both members side by side is the fastest way to see access gating:
Basic sees the Members and Premium videos locked; Premium sees everything.

More detail: [docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md).

---

## Member features

### Landing page
Auto-advancing hero **feature carousel** (5s, pauses on hover and focus,
disabled entirely under `prefers-reduced-motion`), social-proof testimonials, and
an **"Explore our library"** category grid.

### Onboarding — health check-in
Four plain-language questions — movement preference, recent surgery or fall,
dizziness, joint pain — scored **server-side** into a recommended track
(**Seated**, **Supported**, or **Active**), then account creation via magic link.
The Seated result carries a safety notice about locked high-intensity videos.

### Dashboard
- **Practice-minutes** line chart (last 8 weeks) and **focus-area** donut, both
  from live aggregates over watch history.
- Stat cards: current streak, minutes this month, sessions done, lessons complete.
- **Today's suggested session** — the first unstarted video matching your track.
- **Mood check-in** — a 1–5 slider, saved as you move it.
- **Your access level** — current plan, what it unlocks, and *Manage / upgrade plan*.
- **Your subscriptions** — follow categories, masters, and levels.
- **New for you** — fresh videos matching what you follow, with the reason shown.
- **My Library** — tabbed **Subscribed / Liked / Favorites** with progress bars.

### Categories, levels, subscriptions
Focus areas **Balance, Breathing, Joint health, Safety** (plus a *Seated only*
filter), and a progression ladder: **Level 0 Foundations → Level 1 Building
Support → Level 2 Confident Movement**. Members follow any category, master, or
level; following drives both New-for-you and notifications. Available on the
Member and Premium plans.

### Plans and access levels
| Plan | Price | Unlocks |
|---|---|---|
| **Basic** | Free | All Free videos, progress tracking, health check-in |
| **Member** | $9/mo | + Members-only classes, subscribe to masters & levels |
| **Premium** | $19/mo | + Premium masterclasses, early access |

Every video is tagged **Free**, **Members**, or **Premium**. Basic sees Free;
Member sees Free + Members; Premium sees everything. Opening a locked video shows
an upgrade modal naming the video, its required tier, and the plan cards.

Locked videos still display intensity, stance, focus, duration, master, and tier
— you always know what a session involves before committing. The playback URL is
stripped server-side, so the lock is enforced, not merely drawn.

### Video library and player
Filter by focus area, intensity, stance, and master; filters live in the URL, so
any view is shareable and bookmarkable. The player has large-target controls, a
seek bar, a caption overlay, an **interactive transcript** (tap a line to jump),
and a sticky **syllabus accordion** with per-lesson completion tracking.

### Notifications
Header bell with an unread badge, polling for new items. Each notification names
its reason — *"New from Master Ken Ryu"*, *"New in Balance"* — and its access
tier, showing **🔒 Upgrade to watch** when your plan doesn't cover it.
Notifications are generated automatically when staff publish a video in something
you follow.

### Supporting pages
**About** (mission, team), **Blog** — *The Steady Path Journal*, six full
articles — **Account** (plan, track, sign out), member **Login**, and a link
through to admin sign-in.

---

## Admin features

Reached via **Staff member? → Admin sign-in**. Role is enforced in middleware,
re-checked on every admin page, and re-checked again inside every admin action.

### Reports & Impact
Program KPIs (total members, active this week, average progress, 30-day retention
cohort), a **new-members-per-month** chart, and a filterable **member progress
report** with **Download PDF**.

### Videos
- **Catalog** — every video with inline editing of **access level** and
  **status**. Moving a video to Published notifies every subscribed member and
  reports how many were told.
- **Video editor** — full metadata edit and delete, plus a **syllabus builder**
  (chapters → lessons, reorderable) and a **transcript editor**. Transcripts are
  edited as `m:ss  text` lines and parsed strictly, naming any bad line rather
  than dropping a caption silently.
- **Upload** — Mux direct upload when configured, otherwise a source URL. Either
  way the video starts as *Processing* and an asset-ready webhook publishes it.
- **Skill levels** — build the Level 0 → 2 ladder: create, edit, remove, assign
  videos, and reorder with keyboard-operable ↑/↓ controls.

### Members
Full roster — name, age, track, plan, joined, progress, last activity, and
derived **status** (Active / At risk / Inactive) — with filters by name, track,
plan, and age range, plus PDF export. Clicking a name opens **member detail**:
track, the raw health answers, session history, subscriptions, saved videos,
recent moods, and recent notifications. Read-only in v1: no destructive actions.

### Content
CRUD for everything that isn't a video: **journal posts** (live on `/blog`
immediately; slugs are frozen after publish so links never break), the **team**
on the About page, **focus areas**, and **instructors**. Deletes are refused
rather than cascaded where removal would silently change what members see — a
focus area with videos, or an instructor credited on a session.

### Settings
Read-only diagnostics: which integrations are live versus running in local mode
and the concrete consequence of each, which environment variables to set, content
totals, and an index of the docs. Secret *values* are never displayed.

Every PDF export carries the confidentiality footer
*"Confidential — member health data. Handle per HIPAA / PIPEDA policy."*

Full walkthrough: [docs/ADMIN_GUIDE.md](./docs/ADMIN_GUIDE.md).

---

## Accessibility

Accessibility is a core requirement, not a pass at the end. Controls live in the
**Accessibility** panel in the header and persist per user (and in a cookie for
anonymous visitors, so there's no flash of the wrong theme):

- **Text size** — 16 / 20 / 24px, applied at the root so the entire UI scales.
- **High contrast** — maximum-legibility palette that overrides light *and* dark.
- **Read aloud** — speaks each page's heading on navigation.
- **Light / Dark / Auto** — Auto follows the system preference and live-updates.
- **Large touch targets** — 44px minimum, 52–64px for primary actions.
- **Full keyboard navigation** with a visible focus ring; skip link on every page.
- **Reduced motion** honoured, including switching carousel autoplay off.
- **Colour is never the only signal** — locks, tiers, and statuses are labelled.

Details and a verification checklist: [docs/ACCESSIBILITY.md](./docs/ACCESSIBILITY.md).

---

## Project status

| Check | Result |
|---|---|
| `npm run typecheck` | Clean |
| `npm run build` | Clean — 40 routes, 18 of them admin |
| `npm test` | **49 unit tests passing** (business rules, transcript parsing) |
| `npm run test:e2e` | **29 specs passing** — 3 consecutive green runs |
| Manual integration | Access gating, magic-link auth, publish fan-out, and cron verified against a production build |

Running the e2e suite (rather than shipping it unrun) found four real defects,
each now fixed and regression-tested: admin sign-in was an infinite redirect
loop, every missing page returned HTTP 200 instead of 404, deleted rows lingered
on screen, and 18 flex lists had lost their screen-reader list semantics. The
details are in [docs/TESTING.md](./docs/TESTING.md).

All spec features are implemented. Some deviations remain — custom auth instead
of Auth.js, a print route instead of a PDF byte stream, and a few others — each
listed with a reason and a cost-to-close in [docs/SPEC_COMPLIANCE.md](./docs/SPEC_COMPLIANCE.md).

---

## Repository layout

```
src/lib/domain.ts        Every business rule — framework-free, unit-tested
src/lib/queries.ts       Read models for Server Components
src/lib/auth.ts          Sessions, magic links, admin credentials
src/lib/{billing,media,mail}.ts   Third-party adapters + local fallbacks
src/actions/             Server Actions (all mutations)
src/app/                 Routes, API handlers, webhooks, cron
src/components/          UI ported from the prototype
prisma/schema.prisma     Data model
prisma/seed.ts           The prototype's sample data
docs/                    Documentation — start at docs/README.md
index.html               The original prototype (UI/UX reference, not built)
```

`index.html`, `support.js`, and `image-slot.js` are the original single-file
Design Component prototype. They remain as the UI reference and are not part of
the Next.js build.

---

## Technical notes

- **Server-first.** Server Components read; Server Actions write; Route Handlers
  exist only where an external caller or browser primitive needs a URL.
- **One home for the rules.** `canView`, `computeTrack`, `deriveMemberStatus`,
  streaks, and progress live in `src/lib/domain.ts` and nowhere else.
- **Sessions are database-backed**, so plan and role changes take effect on the
  next request. Session and magic-link tokens are stored only as SHA-256 hashes.
- **Plans change in exactly one function**, called only from the billing webhook
  — never optimistically from the client.
- **Derived, not stored.** Member status and all practice aggregates are computed
  on read; the nightly cron reports and prunes but writes nothing to `User`.

Built for COMP 370. Always talk to your doctor before starting a new exercise
programme.
