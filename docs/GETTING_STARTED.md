# Getting started

## Requirements

- Node.js 20 or newer (developed on 22)
- npm (the repo ships a `package-lock.json`; pnpm also works)

Requires PostgreSQL: fastest path is `docker compose up`, or point `DATABASE_URL`
at a local Postgres instance (see [DEPLOYMENT.md](./DEPLOYMENT.md) for both
options). No API keys required; documented in-process fallbacks for email,
billing, and video hosting — see [INTEGRATIONS.md](./INTEGRATIONS.md).

## Install and run

```bash
npm install
cp .env.example .env        # on Windows: copy .env.example .env
npm run setup               # prisma generate + db push + seed
npm run dev                 # http://localhost:3000
```

`npm run setup` is idempotent — rerun it any time. To wipe and reseed:

```bash
npm run db:reset
```

## Demo logins

| Who | How to sign in |
|---|---|
| **Staff / admin** | `/admin/login` → `admin@evergrace.example` / `EverGrace!Admin1` |
| **Premium member** (Margaret Ellison) | `/login` → `margaret-ellison@example.com` |
| **Basic member** (Frank Alvarez) | `/login` → `frank-alvarez@example.com` |
| **Brand new member** | `/onboarding` → finish the check-in → enter any email |

Members sign in with a magic link and no password. Because no email provider is
configured locally, **the link is printed to the terminal running `npm run dev`
and also rendered as a button on the page** — click it to sign in. Both admin
credentials come from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

The two member accounts above are deliberately on different plans, which is the
quickest way to see access gating: Frank (Basic) sees the Members and Premium
videos locked; Margaret (Premium) sees everything.

## A five-minute tour

1. **`/`** — hero, autoplaying feature carousel, testimonials, category grid.
2. **`/onboarding`** — the four health questions. Answer "seated in a chair" to
   land on the Seated track and see the safety notice.
3. **`/library`** — filter by focus, intensity, stance, or master; the filters
   are in the URL, so the view is shareable. Note that locked cards still show
   intensity, stance, focus, and length.
4. **`/library/tai-chi-weight-shifts`** — signed out, this Premium video is
   locked and no media URL is sent to the browser. Sign in as Margaret and it
   plays, with a clickable transcript and a syllabus you can tick off.
5. **`/dashboard`** — streak, practice-minutes chart, focus donut, suggested
   session, mood slider, follow chips, "New for you", and My Library tabs.
6. **`/admin/reports`** — KPIs, signups chart, filterable roster, and
   **Download PDF**, which opens a print sheet carrying the confidentiality
   footer and reflecting exactly the filtered rows.
7. **`/admin/videos`** — change a video's access level or status inline. Move
   "Evening Wind-Down" to **Published** and every member following Breathing
   gets a notification; watch the bell badge.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run setup` | Generate client, push schema, seed |
| `npm run db:reset` | Drop, recreate, reseed |
| `npm run db:seed` | Reseed only |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit suite (business rules) |
| `npm run test:e2e` | Playwright suite (needs `npx playwright install chromium`) |

## Accessibility controls

The **Accessibility** button in the header sets text size (16/20/24px), high
contrast, and read-aloud. The light/dark/auto switch sits next to it. Choices
persist in a cookie for anonymous visitors and on the user record once signed
in. See [ACCESSIBILITY.md](./ACCESSIBILITY.md).
