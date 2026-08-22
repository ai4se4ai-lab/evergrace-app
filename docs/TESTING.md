# Testing

## What is covered today

| Suite | Command | Status |
|---|---|---|
| Types | `npm run typecheck` | Clean |
| Production build | `npm run build` | Clean, 40 routes (18 admin) |
| Unit — business rules | `npm test` | **49 tests passing** |
| End-to-end | `npm run test:e2e` | **29 specs passing** (3 consecutive green runs) |
| Manual integration | see below | Run and recorded |

## Bugs these suites found

Running the e2e suite — rather than shipping it unrun — surfaced four real
defects. Recording them here because each is the kind that static checks and a
green build will never catch:

1. **Admin sign-in was impossible.** `/admin/login` sat inside
   `app/admin/layout.tsx`, which redirects sessionless visitors *to*
   `/admin/login` — an infinite redirect loop. Moved to the `(staff-auth)` route
   group; same URL. A round-1 smoke check had reported this route as `200`, which
   was simply wrong.
2. **Every missing page returned HTTP 200.** A root `loading.tsx` put a Suspense
   boundary above every page, committing the status before `notFound()` ran, so
   crawlers would have indexed "not found" pages. Loading skeletons are now
   scoped to the auth-gated segments.
3. **Deleted rows lingered on screen.** `router.refresh()` was called from inside
   the row's own delete button, which unmounts mid-flight, and after an `await`,
   so React could coalesce it away. Replaced with `useDataRefresh`.
4. **Lists lost their semantics.** Chromium drops the `list`/`listitem` roles
   from a `<ul>` that is `display: flex` — 18 lists across the app were affected,
   so screen readers would not announce them as lists. `role="list"` restored.

## Unit tests

[`src/lib/domain.test.ts`](../src/lib/domain.test.ts) covers the rules the spec
names as the executable specification. `src/lib/domain.ts` imports nothing from
Prisma, React, or Next, so these run in milliseconds with no fixtures.

```bash
npm test          # once
npm run test:watch
```

What is asserted:

- **`computeTrack`** — all three outcomes, plus the two behaviours that look
  wrong but are specified: branch order (surgery outranks a stated preference for
  supported standing) and "a little" joint pain being enough for `SUPPORTED`.
- **`canView`** — the full 3×3 plan/tier matrix, signed-out treated as Basic,
  admin preview, and plan ordering.
- **`requiredPlanFor`**, **`canFollow`** — tier → plan mapping and the paid gate.
- **`deriveMemberStatus`** — each classification, severity precedence, and the
  exact 25% boundary (25 is `ACTIVE`, 24 is `AT_RISK`).
- **`progressPercent`** — rounding, clamping, zero-duration guard.
- **`computeStreak`** — consecutive days, the yesterday grace window, gap
  breaking, and multiple sessions in one day counting once.
- **Formatting** — durations, timecodes, last-active labels, slugs.

## End-to-end tests

```bash
npm run setup                    # seeded database required
npx playwright install chromium
npm run test:e2e
```

Playwright builds and serves the app itself. Two escape hatches:

```bash
PORT=3210 npm run test:e2e                          # if 3000 is taken
E2E_BASE_URL=http://localhost:3210 npm run test:e2e # reuse your own server
```

It runs a production build rather than `next dev`, because a cold dev compile can
exceed the startup timeout. `workers: 1`, because the specs share one database.

### [`e2e/public-journeys.spec.ts`](../e2e/public-journeys.spec.ts) — 10 specs

Landing hero and CTAs; catalog cards showing intensity/stance/focus/length before
playback; query-string filters with `aria-current`; a Premium video locked for a
signed-out visitor; a Free video playable with its transcript; the check-in
scoring to Seated with the safety notice; `/admin/**` redirecting anonymous
visitors (entry point *and* every section); an unknown video URL returning a real
404; and the accessibility panel changing `html[data-text-size]`.

### [`e2e/admin-console.spec.ts`](../e2e/admin-console.spec.ts) — 19 specs

Signs in through the real credentials form rather than injecting a session.
Covers wrong credentials, the login page being reachable without a session
(the redirect-loop regression guard), tab navigation, reports + filtering,
member detail with its confidentiality notice, access-level and status changes
round-tripping, the video editor, chapter/lesson add and remove, transcript
parsing rejection *and* acceptance, focus-area and instructor CRUD, both
delete-guard refusals, journal publish → appears on `/blog` → delete, team
add/reorder/remove, settings, and the filtered PDF route.

Records carry a per-run suffix so a failed run can't collide with the next, and
each spec restores what it changed.

### Writing e2e specs against this app — three traps

- `getByRole("alert")` also matches Next's permanent
  `<div role="alert" id="__next-route-announcer__">`. Scope it; the suite has an
  `alerts()` helper.
- `getByRole("link", { name: "Content" })` also matches the **"Skip to main
  content"** link. Scope to the nav and use `exact: true`.
- `toHaveCount` counts hidden nodes, so a closed dialog's title can still match.
  Assert on rows, not headings.

Mutations are asserted with a poll-and-reload helper rather than a fixed timeout:
the list updates via a server round trip, and on a loaded machine that can take
longer than a default assertion window even though the write already committed.

### Still missing

No component-level tests (`@testing-library/react`), and no automated axe-core
assertions — accessibility verification is the manual checklist in
[ACCESSIBILITY.md](./ACCESSIBILITY.md) plus the text-size spec. Member-side
authenticated journeys (dashboard, follow toggles, saving videos) are covered
only by the manual checks below.

## Manual integration verification

These were executed against a production build (`next build` + `next start`) on
the seeded database. Reproduce by minting a session row for a seeded user and
sending its token as the `evergrace_session` cookie.

**Routes** — 200 for `/`, `/library`, `/library?focus=Balance`, both video
pages, `/about`, `/blog`, a blog post, `/onboarding`, `/login`, `/admin/login`,
`/api/notifications`; 307 for `/dashboard` and `/admin/reports` when signed out.

**Access gating**

| Case | Result |
|---|---|
| Anonymous on a Premium video | Locked banner *"… is a Premium video"*; no `<video>` element; **no source URL in the HTML**; metadata (Moderate, etc.) still rendered |
| Basic member on a Members video | Locked, with "See plans" |
| Premium member on the same video | Unlocked, play control present |
| Library grid, signed out | Exactly 4 "Upgrade to watch" labels (2 Members + 2 Premium), all 6 tier badges rendered |

**Dashboard** — Premium member: greeting, streak card, "New for you", and
subscriptions all render. Basic member: the follow upsell renders.

**Admin** — `/admin/reports`, `/admin/users`, `/admin/videos`,
`/admin/videos/levels`, `/admin/videos/upload`, `/admin/reports/print` all 200
with an admin session. Reports shows the KPIs, the signups chart, and roster
rows. The print sheet carries the HIPAA / PIPEDA confidentiality footer.

**Publish → notification fan-out**

```
before: status = DRAFT, notifications = 0
webhook: 200 {"received":true,"status":"PUBLISHED","notified":1}
after:   status = PUBLISHED, publishedAt set = true
         notifications = [ frank-alvarez@example.com :: "New in Breathing" ]
after replay: notifications = 1        # idempotent
wrong secret: 401
```

**Cron**

```
200 {"members":12,"statuses":{"ACTIVE":9,"AT_RISK":2,"INACTIVE":1},
     "pruned":{"sessions":0,"magicLinkTokens":0}}
wrong secret: 401
```

The 9 / 2 / 1 distribution matches the prototype's fixture roster, which is a
useful check that `deriveMemberStatus` and the seeded `lastActiveAt` values agree.

**Magic-link auth**

| Case | Result |
|---|---|
| First use, unknown email | 307 → `/onboarding`, httpOnly session cookie set, account created |
| Replay of the same token | 307 → `/login?error=expired`, no cookie |
| Expired token | 307 → `/login?error=expired`, no cookie |
| Unknown token | 307 → `/login?error=expired`, no cookie |
| Existing member with a track | 307 → `/dashboard`, cookie set |

## Gaps, stated plainly

- No component-level tests (`@testing-library/react`); the spec lists it.
- No automated axe-core assertions yet; accessibility verification is the manual
  checklist in [ACCESSIBILITY.md](./ACCESSIBILITY.md) plus the text-size spec.
- No tests against Stripe or Mux themselves. Signature verification and the
  webhook handlers are unit-testable in isolation; the local equivalents were
  exercised instead.
- The e2e suite mutates the seeded database. It restores what it touches, but if
  a run is interrupted mid-spec, `npm run db:reset` returns you to a clean
  baseline.
