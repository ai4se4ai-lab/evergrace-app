# COMP 370 Final Project — EverGrace

**Senior Martial Arts & Active Aging Platform**

This document is the project brief for COMP 370 (Software Engineering) students
at UFV working on **EverGrace** as their capstone project. It assumes you are
starting from the working codebase already in this repository — read this
alongside [docs/README.md](./README.md), [ARCHITECTURE.md](./ARCHITECTURE.md),
[DATA_MODEL.md](./DATA_MODEL.md), [BUSINESS_RULES.md](./BUSINESS_RULES.md), and
[GETTING_STARTED.md](./GETTING_STARTED.md), which describe the system you are
extending.

---

## 1. Motivation

EverGrace is a real multidisciplinary capstone: your team is not the only
group working on it. Business students are defining pricing and growth
strategy, Communication students are writing member-facing copy and content
calendars, Graphic and Digital Design students are producing the visual
identity and photography, Jujutsu Society instructors are supplying the
actual technique curriculum and safety progressions, and Nursing students are
reviewing exercise content for fall-risk and mobility safety. Each of these
groups works on their own timeline, with their own deliverable schedule, and
none of it is guaranteed to land when your sprint plan says it will.

This is deliberate. It mirrors real software engineering: you are almost
never handed a complete, stable spec before you start building. Requirements
arrive late, change, or arrive from a stakeholder who does not think in terms
of tickets. The engineering skill being assessed in this course is not "wait
for good inputs and then implement them" — it is **build a system that can
absorb information as it becomes available, without stalling or requiring a
rewrite when it finally arrives.**

Concretely, that means:

- You do not block on another domain's deliverable. You define the **shape**
  of the data or content you need (a schema, a content contract, a type),
  build against realistic **placeholder/fixture data** that satisfies that
  shape, and wire the whole feature — frontend, backend, tests — end to end.
- When the real input arrives (Nursing's safety annotations, Communication's
  blog copy, Design's photography, Business's pricing tiers, Jujutsu
  Society's curriculum), it replaces the fixture data through the same seam
  you already built and tested. If your contract was well-designed, this is
  a data change, not a code change.
- You are not building from a blank canvas. This repository is a working,
  tested, deployed reference implementation of the platform's MVP — routes,
  data model, business rules, accessibility, auth, billing, and video
  delivery are already built and documented (see [PROJECT_SPEC.md](./PROJECT_SPEC.md)
  for the original spec and [SPEC_COMPLIANCE.md](./SPEC_COMPLIANCE.md) for what's
  implemented). Your job is to **extend this template** with a scoped feature
  or feature set, not to reproduce it. Read the existing code before writing
  new code — the patterns you need (a Server Component reading through
  `src/lib/queries.ts`, a Server Action validating with Zod, a domain rule in
  `src/lib/domain.ts`) already exist and are already tested; follow them
  rather than inventing new ones.

By the end of the term, your team should be able to demo a real, working
addition to EverGrace, built the way production software is actually built:
incrementally, against contracts, with tests that prove it, on a system that
degrades gracefully when an upstream dependency (a person, not just a
service) is late.

---

## 2. What You Need to Do

Work through these five steps in order. Each step lists a frontend task, a
backend task, and how to test/debug/deploy what you built, so that by the end
of each step you have something running, not just something written.

### Step 1 — Orient: run the template, pick your feature slice

Before writing anything, get the existing app running and understand where
your feature will live.

1. Follow [GETTING_STARTED.md](./GETTING_STARTED.md) to install, seed, and run
   the app locally, and walk its "five-minute tour."
2. Read [ARCHITECTURE.md](./ARCHITECTURE.md) (layers: domain → queries →
   actions → components) and [DATA_MODEL.md](./DATA_MODEL.md) (the Prisma
   schema) so you know where a new rule, query, or table belongs.
3. Choose a feature slice that connects to at least one other discipline's
   input. Examples that fit the existing data model and route map:
   - A Nursing-reviewed **safety flag / contraindication note** on videos
     (extends `Video`, surfaces in `/library/[videoId]`).
   - A Communication-authored **content calendar** view of `BlogPost`
     (extends `/blog`, adds scheduling/status).
   - A Business-defined **plan comparison / promo pricing** experience
     (extends the plan modal in `/account` and `/dashboard`).
   - A Jujutsu-Society-informed **skill-progression prerequisite** rule
     (extends `Level`, gates a video until prior levels are complete).
   - A Graphic-Design-led **visual refresh of one surface** (e.g. the
     landing page hero and testimonials) using new design tokens.

**Example (frontend):** duplicate an existing simple page
(`src/app/about/page.tsx`) as a scratch page to confirm you can render inside
the app shell and pick up `globals.css` design tokens.

**Example (backend):** run `npm run db:seed` and open Prisma Studio
(`npx prisma studio`) to browse the seeded data your feature will extend.

**Test / debug / deploy:** `npm run typecheck` and `npm test` should be
green before you change anything — this is your baseline. `docker compose up`
should also boot cleanly; confirm `curl http://localhost:3000/api/health`
returns `200` so you know the deploy path works before you touch it.

### Step 2 — Define the contract, not the content

This is the step that makes the "information arrives late" problem
tractable. Before any real content exists (Nursing's guidance, Design's
photos, Business's numbers), define the **shape** that content must take.

1. Write a Zod schema and/or Prisma model for the data your feature needs —
   this is the contract the other discipline's input must satisfy, whatever
   form it eventually arrives in (a spreadsheet, a Google Doc, a Figma file,
   an email).
2. Write fixture/seed data that satisfies that contract, extending
   `prisma/seed.ts`. Make the fixtures realistic enough to demo against —
   reviewers should not be able to tell your feature is running on
   placeholder data from the UI alone.
3. Document, in one paragraph in your team's README, exactly what format you
   need the real input in (e.g. "one CSV row per video: `videoId,
   riskLevel, note`") so the other discipline's students have something
   concrete to hand you.

**Example (backend):** add a `Video.safetyNote String?` and
`Video.riskLevel RiskLevel?` (`enum RiskLevel { LOW MODERATE HIGH }`) to
`prisma/schema.prisma`, run `npx prisma db push`, then seed 3–4 videos with
sample notes in `prisma/seed.ts`.

**Example (frontend):** nothing yet — this step is contract-first on
purpose. Resist the urge to build UI before the shape is settled; it is the
UI you would have to redo if the shape changes.

**Test / debug / deploy:** add a Vitest case in the style of
`src/lib/domain.test.ts` that asserts your Zod schema accepts a valid fixture
and rejects an invalid one (missing field, wrong enum value). This test is
what will catch a malformed real-world input later, before it reaches
production.

### Step 3 — Build the backend: query, rule, action

Wire your fixture data into the app through the same layered pattern the
rest of the codebase uses.

1. Add any pure business rule to `src/lib/domain.ts` (framework-free,
   directly unit-testable) — e.g. `shouldShowSafetyWarning(video, member)`.
2. Add a read model to `src/lib/queries.ts` that returns the shape your page
   needs (`server-only`).
3. If your feature needs a mutation (e.g. an admin editing the safety note),
   add a Server Action in `src/actions/`: validate with Zod → authorize
   (`requireAdmin()`/`requireViewer()`) → write via Prisma →
   `revalidatePath()`.

**Example (backend):** `getVideoDetail` in `src/lib/queries.ts` already
assembles everything a video page needs — extend its return type to include
`riskLevel`/`safetyNote`, and add `requiresSafetyAcknowledgement(video)` to
`src/lib/domain.ts`.

**Example (frontend):** still none — verify the data flows correctly with a
quick `console.log` in the Server Component or Prisma Studio before building
UI on top of it.

**Test / debug / deploy:** write a unit test for your new domain function
following the patterns in `src/lib/domain.test.ts` (cover each branch, not
just the happy path). Run `npm run typecheck` — most backend mistakes in
this codebase (wrong field name, wrong enum) are caught here before you ever
open a browser.

### Step 4 — Build the frontend: component, page, accessibility

Now build the UI, following [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) and
[ACCESSIBILITY.md](./ACCESSIBILITY.md) — these are not optional polish for
this app; the accessibility panel (text size, high contrast, read-aloud,
theme) is a first-class, tested feature, and your addition must work with
all of it.

1. Build the Client/Server Component in `src/components/`, reusing existing
   primitives (badges, cards, modals) rather than inventing new ones — check
   `src/components/ui/` first.
2. Wire it into the relevant route in `src/app/`.
3. Use placeholder assets (a plain-color box, a generic icon, lorem-ipsum-
   grade but realistic copy) wherever a real asset from Design or
   Communication is still pending. Isolate these placeholders behind a
   single, obvious seam (a named component, a constant) so swapping in the
   real asset later is a one-file change.

**Example (frontend):** add a `<SafetyBadge riskLevel level={video.riskLevel} note={video.safetyNote} />`
component that renders next to the existing intensity/stance badges on the
video detail page (`src/app/library/[videoId]/page.tsx`), using the
`--accent`/`--muted` tokens from `globals.css` — never hard-coded colors.

**Example (backend):** if the admin needs to edit this field, add the input
to the existing video-editor form in `src/app/admin/videos/[videoId]` and
call your Step 3 Server Action on submit.

**Test / debug / deploy:** run the app with `npm run dev`, then manually
verify your feature at all three text sizes and in high-contrast mode (the
Accessibility panel in the header). Use React DevTools / browser DevTools to
confirm no hydration mismatch or layout shift. Confirm `npm run build`
still succeeds — a component that only works under `next dev` is not done.

### Step 5 — Test, debug, and deploy the whole slice

Treat your feature as incomplete until it is covered the same way the rest
of the app is (see [TESTING.md](./TESTING.md) for what that standard looks
like here).

1. **Unit tests** — every domain rule you added gets a Vitest case in
   `src/lib/domain.test.ts` covering each branch and boundary condition.
2. **End-to-end test** — add a Playwright spec (or extend
   `e2e/public-journeys.spec.ts` / `e2e/admin-console.spec.ts`) that drives
   your feature through the browser: the exact user journey a demo reviewer
   would try.
3. **Debugging** — when something breaks, don't guess: reproduce with the
   smallest possible input, check the layer boundaries first (is the query
   returning what you expect in Prisma Studio? Is the Server Action actually
   being called — check the Network tab? Is `revalidatePath` targeting the
   right route?). [ARCHITECTURE.md](./ARCHITECTURE.md)'s "Caching,
   revalidation, and refresh" section documents two real bugs this exact
   codebase hit (a `router.refresh()` swallowed after an `await`, and a
   `<ul>` losing ARIA roles under `display:flex`) — read it before assuming
   your bug is novel.
4. **Deploy** — confirm your feature survives a production build and the
   Docker Compose path end to end:

   ```bash
   npm run typecheck
   npm test
   npm run build
   docker compose up -d db app
   npx playwright install chromium   # first time only
   npm run test:e2e
   ```

   All of the above must be green before you demo. If you deploy to Vercel
   for your team's demo environment, follow
   [DEPLOYMENT.md](./DEPLOYMENT.md)'s checklist — in particular, do not ship
   with the seed admin password unrotated.

**Example (frontend + backend together):** a Playwright spec that visits a
seeded Premium video with `riskLevel = HIGH`, asserts the safety badge and
note are visible, signs in as the seeded admin, edits the note, and asserts
the change is reflected on reload — exercising Steps 3 and 4 as one user
journey, the same way `e2e/admin-console.spec.ts` already does for the rest
of the admin console.

---

## 3. Deliverables

Each team submits three things by the end of the term:

### 3.1 The project (code)

A pull request (or a clearly identified branch/fork) against this
repository containing:

- Your feature, built through Steps 1–5 above, following the existing
  architecture (`src/lib/domain.ts` → `src/lib/queries.ts` →
  `src/actions/*` → `src/components/**`) rather than a parallel structure.
- All new business rules covered by unit tests; the user journey covered by
  at least one Playwright spec.
- `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e`
  passing.
- A short `TEAM_README.md` in your feature's directory (or appended to this
  doc's companion) stating: what you built, what real-world input (from
  Business/Communication/Design/Jujutsu Society/Nursing) it depends on, the
  exact contract/shape you defined for that input in Step 2, and what is
  still running on placeholder data at submission time.
- Working locally (`npm run dev`) **and** via `docker compose up`.

### 3.2 The demo

A working, live walkthrough of your feature running in the app (local dev
server or Docker Compose is fine — it does not need to be deployed to the
public internet). The demo must show:

- The feature working end to end, from the UI action through to the
  persisted database change and back.
- At least one accessibility mode (large text or high contrast) applied to
  your feature without breaking layout.
- What happens with placeholder data vs. what changes when real input is
  substituted — even if you show this by manually swapping a fixture file
  live, the point is to demonstrate the seam from Step 2 actually works.

### 3.3 The presentation (10 minutes)

A 10-minute presentation to the class covering:

1. **The problem your slice solves** and which other discipline(s) it
   connects to (1–2 min).
2. **The contract you designed** — what shape of input you needed, and why
   you chose that shape (2–3 min).
3. **Architecture walkthrough** — where your code lives in the existing
   layers, and one design decision you'd defend (2–3 min).
4. **Live demo** (2–3 min) — see 3.2.
5. **What you'd do with more time** — what's still on placeholder data, what
   you'd test next (1 min).

Leave time for questions; presentations running significantly over 10
minutes will be cut off.
