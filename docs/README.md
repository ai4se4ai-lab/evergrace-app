# EverGrace documentation

The MVP implementation of the platform described in [PROJECT_SPEC.md](./PROJECT_SPEC.md),
built with Next.js (App Router), TypeScript, Tailwind, and Prisma. The UI is a
direct port of the single-file prototype at [`../index.html`](../index.html) —
its copy, layout, design tokens, and business rules are preserved.

## Start here

| Document | What it covers |
|---|---|
| [GETTING_STARTED.md](./GETTING_STARTED.md) | Install, seed, run, and the demo logins |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Layers, request flow, where each rule lives |
| [DATA_MODEL.md](./DATA_MODEL.md) | Every table, relation, and the derived values |
| [BUSINESS_RULES.md](./BUSINESS_RULES.md) | Access gating, track scoring, member status, streaks |
| [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) | Every admin screen, and the rules it enforces |
| [API.md](./API.md) | Routes, Server Actions, webhooks, payloads |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Tokens, typography, components, theming |
| [ACCESSIBILITY.md](./ACCESSIBILITY.md) | What is implemented against spec §7, and how to test it |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Email, Stripe, Mux, Sentry — adapters and local fallbacks |
| [TESTING.md](./TESTING.md) | Unit and e2e suites, plus the manual verification script |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | SQLite → Postgres, Vercel, cron, environment |
| [SPEC_COMPLIANCE.md](./SPEC_COMPLIANCE.md) | Section-by-section status and every deviation |

## The short version

- **Members** browse a public catalog, take a 4-question health check-in that
  assigns a track, and get a dashboard with charts, a suggested session, mood
  check-in, follows, and a saved-video library.
- **Access is tiered.** Videos are tagged Free / Members / Premium; plans are
  Basic / Member / Premium. A locked video still shows all of its metadata — the
  playback URL is stripped server-side.
- **Staff** manage the catalog (including each video's syllabus and transcript),
  build the skill-level ladder, edit the journal, team, focus areas and
  instructors, read member detail, and export filtered reports as PDFs.
  Publishing a video notifies every member who follows its category, master, or
  level.
- **Accessibility is a feature, not a pass.** Text scaling, high contrast,
  read-aloud, and light/dark/auto theming are first-class and persisted.

## Reading the code

```
src/lib/domain.ts          Every business rule, framework-free and unit-tested
src/lib/queries.ts         Read models for Server Components
src/lib/auth.ts            Sessions, magic links, admin credentials
src/lib/{billing,media,mail}.ts   Third-party adapters with local fallbacks
src/actions/               Server Actions (all mutations)
src/app/api/               Webhooks, cron, and the polled/beacon endpoints
src/app/                   Routes — see the route map in ARCHITECTURE.md
src/components/            UI, ported from the prototype
prisma/schema.prisma       Data model
prisma/seed.ts             The prototype's sample data
```
