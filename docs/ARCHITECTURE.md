# Architecture

## Shape of the app

A single Next.js App Router application. Server Components read; Server Actions
write; Route Handlers exist only where an external caller or a browser primitive
needs a URL (webhooks, cron, `sendBeacon`, polling).

```
                    ┌─────────────────────────────────────────┐
   Browser ────────▶│ Server Components (src/app/**/page.tsx)  │
                    │   read through src/lib/queries.ts        │
                    └───────────────┬─────────────────────────┘
                                    │
   Client Components ──────────────▶│ Server Actions (src/actions/*)
   (forms, chips, player)           │   validate with Zod, enforce auth,
                                    │   revalidatePath()
                                    ▼
   Stripe / Mux ───▶ Route Handlers ├──▶ src/lib/domain.ts   (pure rules)
   Vercel Cron ───▶ (src/app/api/**)└──▶ Prisma ──▶ database
```

### Layers

| Layer | Location | Rule |
|---|---|---|
| Domain | `src/lib/domain.ts` | Pure functions and enums. No Prisma, React, or Next imports, so it is directly unit-testable. |
| Read models | `src/lib/queries.ts` | Every query a page needs, returning view-ready shapes. `server-only`. |
| Mutations | `src/actions/*.ts` | Validate → authorize → write → revalidate. |
| Adapters | `src/lib/{mail,billing,media}.ts` | One interface per third party, each with a local fallback. |
| Presentation | `src/components/**` | Ported from the prototype. Client Components only where interactive. |

The point of the domain layer is that the rules the spec cares about —
`canView`, `computeTrack`, `deriveMemberStatus` — live in exactly one place and
are covered by tests, rather than being re-derived in each component.

## Route map

Public:

| Route | Notes |
|---|---|
| `/` | Landing. Categories from the database; marketing copy from `src/content/site.ts`. |
| `/onboarding` | Health check-in wizard → account creation |
| `/login` | Member magic-link sign-in |
| `/admin/login` | Staff credentials sign-in |
| `/library` | Catalog. Filters are query params (`?focus=&intensity=&stance=&master=`). |
| `/library/[videoId]` | Player, transcript, syllabus. Accepts a slug or an id. |
| `/about`, `/blog`, `/blog/[slug]` | Marketing. Blog posts are statically generated. |

Authenticated:

| Route | Guard |
|---|---|
| `/dashboard` | Signed-in member |
| `/account`, `/account/confirm` | Signed-in member |
| `/admin/reports` (+ `/print`) | `role = ADMIN` |
| `/admin/users`, `/admin/users/[userId]` (+ `/print`) | `role = ADMIN` |
| `/admin/videos`, `/admin/videos/[videoId]` (+ `/print`, `/upload`, `/levels`) | `role = ADMIN` |
| `/admin/content/{blog,team,categories,masters}` | `role = ADMIN` |
| `/admin/settings` | `role = ADMIN` |

**`/admin/login` deliberately lives outside `app/admin/`**, in the
`(staff-auth)` route group. `app/admin/layout.tsx` redirects anyone without an
admin session to the login page; if the login page were inside that layout, it
would redirect to itself forever. The URL is unchanged — route groups don't
appear in the path — and `e2e/admin-console.spec.ts` guards against a
regression.

API:

| Route | Purpose |
|---|---|
| `GET /api/auth/callback` | Consumes a magic-link token, creates the session |
| `GET|PATCH /api/notifications` | Bell polling and "mark all read" |
| `PATCH|POST /api/progress` | Watch-progress heartbeat (works with `sendBeacon`) |
| `POST /api/checkin`, `/api/mood`, `/api/follow` | Spec-mandated endpoints wrapping the same actions |
| `POST /api/stripe/webhook` | The only path that grants or revokes a paid plan |
| `POST /api/mux/webhook` | `video.asset.ready` → publish + notify |
| `POST /api/media/webhook` | Local stand-in for the above |
| `POST /api/cron/recompute-status` | Nightly status report + session/token pruning |

See [API.md](./API.md) for payloads.

## Authorization

Three independent checks, deliberately:

1. **`src/middleware.ts`** (Edge) — redirects when no session cookie is present.
   It cannot query the database, so it never decides *roles*; it only avoids
   rendering a signed-out shell. It imports `SESSION_COOKIE` from
   `src/lib/session-cookie.ts` rather than `lib/auth`, because the Edge runtime
   cannot bundle `node:crypto`.
2. **Page level** — `src/app/admin/layout.tsx` re-reads the session and redirects
   non-admins. Member pages call `getViewer()` and redirect.
3. **Action level** — every admin action calls `requireAdmin()`; every member
   action calls `requireViewer()`. This is the check that actually matters: a
   Server Action is a public endpoint, so the client is never trusted.

### Sessions

Database-backed, not JWTs, so a plan or role change takes effect on the next
request (spec §6.3). The cookie holds random bytes; only a SHA-256 hash of the
token is stored, so a database leak does not yield live sessions. Magic-link
tokens are hashed the same way and are single-use with a 20-minute expiry —
verified in [TESTING.md](./TESTING.md).

## Access gating

`canView(video, viewer)` compares plan rank to access rank. It is applied in two
places for two different reasons:

- **`getVideoDetail`** strips `sourceUrl` and `muxPlaybackId` from the payload
  when the viewer cannot watch. This is the enforcement.
- **`VideoCard` / `LockedStage`** render the lock affordance. This is the
  presentation of a decision already made.

Metadata — intensity, stance, focus, duration, access tier — is *never* hidden
behind the gate. That is the spec's "no surprises" principle (§6.7): a member
must be able to tell what a session involves before committing to it.

## Publish → notification fan-out

`fanOutNewVideo(videoId)` in `src/lib/notifications.ts` runs whenever a video
enters `PUBLISHED`, from either the admin action or an asset-ready webhook. It:

1. Loads every `Follow` matching the video's category, master, or level.
2. Collapses them to one notification per member, preferring the most specific
   reason (master > level > category), using the prototype's exact copy:
   `"New from Master Kenneth Brake"`, `"New in Level 0 — Foundations"`, `"New in Balance"`.
3. Skips members who already have a notification for that video, so a
   draft → published → draft → published cycle does not duplicate.

The spec puts this in Inngest. Here it runs inline, which is correct and fast
enough at MVP roster size. `fanOutNewVideo` is the single seam to move behind a
queue: enqueue the id instead of awaiting the call, and the rest is unchanged.

## Derived, never stored

Two values are computed on read rather than persisted, as the spec requires:

- **Member status** (`ACTIVE` / `AT_RISK` / `INACTIVE`) — from `lastActiveAt` and
  average progress. `POST /api/cron/recompute-status` therefore writes nothing
  to `User`; it reports the current distribution and prunes expired sessions and
  tokens.
- **Practice aggregates** — streak, minutes this month, weekly buckets, and the
  focus donut are all computed from `Progress` rows at request time.

## Caching, revalidation, and refresh

Pages that read per-viewer data are dynamic by necessity (they call `cookies()`).
Blog posts are statically generated via `generateStaticParams`. Mutations call
`revalidatePath` for the views they invalidate — an access-level change, for
instance, revalidates `/admin/videos`, `/library`, and `/dashboard`.

`revalidatePath` clears the server's cache but does not repaint the page you are
looking at, so the admin list screens also re-fetch their Server Component after
a mutation. That refresh goes through
[`useDataRefresh`](../src/components/admin/use-data-refresh.ts) rather than a
bare `router.refresh()`, for two reasons found the hard way:

1. the call happens after an `await`, so it lands outside the transition React
   was tracking and can be coalesced away under load; and
2. delete buttons live *inside* the row they remove, so the component unmounts
   mid-flight and takes its pending work with it.

Bumping a counter and refreshing from an effect makes it deterministic — the
effect belongs to the list, which stays mounted. The symptom was lists
intermittently keeping a deleted row until a manual reload.

Reordering (levels, team, chapters, lessons) writes through
`prisma.$transaction` rather than `Promise.all`. Concurrent writes contend on
SQLite, and a half-applied reorder would leave `order` inconsistent.

## Suspense boundaries and 404 status

`notFound()` can only set a 404 if the response status hasn't been committed. A
Suspense boundary above the page — which is what a `loading.tsx` creates —
commits a 200 first. A root-level `src/app/loading.tsx` therefore made **every**
missing page return 200, letting crawlers index "not found" pages.

Loading skeletons are scoped to `/dashboard` and `/admin` instead: both are
behind auth and never crawled, while `/library/[videoId]` and `/blog/[slug]`
keep returning real 404s. There is an e2e regression test for this.
