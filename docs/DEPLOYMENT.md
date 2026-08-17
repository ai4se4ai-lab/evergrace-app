# Deployment

## Moving from SQLite to PostgreSQL

The MVP originally shipped on SQLite to minimize initial infrastructure
requirements; the spec targets PostgreSQL 15+. The migration is mechanical and
has been performed (the app now runs on Postgres via Docker Compose or a local
instance). This section documents the approach if you need to understand how the
migration was structured or reverse it.

### 1. Switch the provider

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 2. Promote the string columns to enums (optional but recommended)

SQLite has no enum type, so nine spec enums are stored as `String` with their
permitted values defined in `src/lib/domain.ts` and enforced by Zod at every
write. The stored values are already exactly the spec's, so no data has to be
transformed. Add the enum declarations from spec §4 and change the column types:

```prisma
enum Plan   { BASIC MEMBER PREMIUM }
enum Role   { MEMBER ADMIN }
// … AccessLevel, VideoStatus, Track, MemberStatus, FollowKind, Intensity, Stance

model User {
  role String  →  role Role   @default(MEMBER)
  plan String  →  plan Plan   @default(BASIC)
  // …
}
```

Then remove the `as Plan` / `as AccessLevel` casts in `src/lib/queries.ts`,
which exist only because SQLite returns `string`. `src/lib/domain.ts` needs no
change: its exported types are structurally identical to the generated enums.

Optionally switch `preferences` from `String` to `Json`.

### 3. Migrate

```bash
npx prisma migrate dev --name init      # generates versioned SQL
npx prisma migrate deploy               # in CI/production
npm run db:seed                         # reference data + demo roster
```

Development so far has used `prisma db push`. Generate the first real migration
before going to production, and use `migrate deploy` from then on.

## Docker Compose (local)

The repo ships a `docker-compose.yml` with `db` (Postgres 16) and `app` (the
Next.js production build). Schema is applied by Postgres itself: `db` mounts
`database/init.sql` into `/docker-entrypoint-initdb.d/`, which Postgres runs
automatically the first time it initializes an empty data volume — there is
no separate migration step or service to wait on. `db` publishes no host
port — it's reachable only from `app`/`tools` on the internal
`evergrace-net` network. Add a port mapping to `db` temporarily if you need
a local DB client for debugging.

```bash
docker compose build
docker compose up -d db app
curl http://localhost:3000/api/health
```

`/docker-entrypoint-initdb.d` scripts only run against a brand-new volume —
if `pgdata` already exists, adding or changing files there does nothing. To
apply a schema change to an existing database, run it by hand (`psql` or
`prisma migrate deploy` from the `tools` service below) or, for local/dev
environments, `docker compose down -v` to recreate the volume from scratch.

`tools` is a one-off service (not started by `docker compose up`, via
`profiles: ["tools"]`) built from the same image as `app` but with full
devDependencies, for commands the slim `runner` image can't run. Seed
reference data (categories, masters, demo roster) — safe to run more than
once, `prisma/seed.ts` upserts by natural key:

```bash
docker compose run --rm tools npx tsx prisma/seed.ts
```

`/api/health` is a **readiness** check (DB reachable), not a liveness
check — a transient Postgres blip won't get `app` restarted by Docker over
it. It's what the `app` service's `HEALTHCHECK` polls.

Tear down: `docker compose down` (add `-v` to also delete the seeded
Postgres volume).

For non-Docker local dev (`npm run dev` outside containers), point
`DATABASE_URL` in `.env` at your own Postgres instance, or temporarily add
a `ports: ["5432:5432"]` mapping to the `db` service and use
`postgresql://evergrace:evergrace@localhost:5432/evergrace`.

## Vercel

1. Import the repository. Build command `npm run build` (it runs
   `prisma generate` first), output preset **Next.js**.
2. Provision Postgres — Vercel Postgres, Neon, or Supabase — and set
   `DATABASE_URL`. Use the pooled connection string for serverless.
3. Set every variable below.
4. Register the Stripe and Mux webhooks against the deployed origin.

### Environment variables

Required:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Pooled Postgres URL |
| `APP_URL` | Absolute origin; magic links are built from it |
| `AUTH_SECRET` | 32+ random bytes. **The app refuses to boot in production with the dev default.** Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CRON_SECRET` | Shared secret for the cron route |

Optional — each unset value falls back to the documented local behaviour
([INTEGRATIONS.md](./INTEGRATIONS.md)):

`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MEMBER`,
`STRIPE_PRICE_PREMIUM`, `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`,
`MUX_WEBHOOK_SECRET`, `SENTRY_DSN`.

Seed-only: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.

> Set `SMTP_HOST` (and the rest of the `SMTP_*` variables) before real members
> sign up. Without it, magic links are only written to the server log —
> nobody can sign in.

### Cron

`vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/recompute-status", "schedule": "0 3 * * *" }
  ]
}
```

Vercel Cron does not send custom headers, so either forward `CRON_SECRET` as a
query parameter and read it in the handler, or accept Vercel's own
`Authorization: Bearer $CRON_SECRET` header — a two-line change in
`src/app/api/cron/recompute-status/route.ts`.

## Production checklist

- [ ] `AUTH_SECRET` set to fresh random bytes (not the `.env.example` value)
- [ ] Seed admin password rotated, or the seeded admin removed and a real staff
      account invited
- [ ] `DATABASE_URL` on managed Postgres, with backups on
- [ ] First Prisma migration generated and applied with `migrate deploy`
- [ ] `SMTP_*` variables set and a test email delivered
- [ ] Stripe keys + webhook registered; prices match $9 / $19
- [ ] Mux keys + webhook registered; **signed playback policy** in use
- [ ] `SENTRY_DSN` set and `error.tsx` reporting to it
- [ ] Cron registered
- [ ] `npm run typecheck`, `npm test`, `npm run test:e2e` green
- [ ] Accessibility checklist walked at 24px text and in high contrast

## Security notes

- Session and magic-link tokens are stored only as SHA-256 hashes; cookies are
  `httpOnly`, `sameSite=lax`, and `secure` in production.
- Sessions are database-backed, so revoking a session or changing a role takes
  effect on the next request.
- Admin authorization is re-checked inside every admin Server Action, not only in
  middleware — a Server Action is a public endpoint.
- Webhook signatures and cron secrets are compared with `timingSafeEqual`; the
  Stripe handler also enforces a five-minute freshness window.
- Admin sign-in compares against a dummy bcrypt hash for unknown or non-admin
  emails, so timing does not disclose which addresses are staff.
- Locked videos never receive a playback URL from the server.
- Member health answers are personal data: the roster and its PDF export carry
  the confidentiality footer, and there is no bulk data export beyond it.
