# Dockerize EverGrace with Docker Compose

## Context

EverGrace is a single Next.js 15 app (App Router, Server Actions) with Prisma
as its ORM. It currently runs on SQLite (`prisma/dev.db`) with schema changes
applied via `prisma db push` — no versioned migrations exist yet.[^1] The task
is to containerize the app and stand it up via `docker compose`, aligned to
`docs/DEV/Robust-Application-Development-Guidelines.md` (the companion
checklist file is present but empty, so guidance is drawn from the guidelines
doc alone).[^2]

## Architecture

Two services, one `docker-compose.yml`: `app` (Next.js, production build) and
`db` (Postgres 16). `app` depends on `db` with a healthcheck gate so the
container waits for a real, connectable database rather than just an open
port.[^3]

## Database

Switch `prisma/schema.prisma`'s `datasource` provider from `sqlite` to
`postgresql`, per the migration path already documented in
`docs/DEPLOYMENT.md`.[^4] Since no migrations exist yet, generate the first
one (`prisma migrate dev --name init`) against a throwaway local Postgres.
Existing Prisma-level constraints (FKs, `@unique`, not-null) carry over
unchanged.[^6]

**Migrations run as a dedicated one-shot service, not inside `app`.** A
`migrate` service (same image as `app`, overridden command: `prisma migrate
deploy`) runs once per `docker compose up`, depends on `db` being healthy,
and is expected to exit 0. `app` sets `depends_on: migrate: condition:
service_completed_successfully`, so it never starts against a half-migrated
schema and never races another `app` replica to apply migrations if the
stack is ever scaled (`docker compose up --scale app=N`).[^5] If `migrate`
exits non-zero (bad migration, dropped connection mid-apply), it stays
stopped/failed and `app` never starts — the failure is visible via `docker
compose ps` / exit code, not masked by a partially-started app.[^20]

## Dockerfile (multi-stage, immutable image)

1. `deps` — installs npm dependencies with `npm ci` (not `npm install`), for
   reproducible, lockfile-exact installs.[^21]
2. `builder` — copies source, runs `prisma generate` then `next build`.
   Requires adding `output: "standalone"` to `next.config.ts` so the runner
   stage only needs the minimal traced output, not the full `node_modules`
   tree.[^7]
3. `runner` — copies the standalone output + static assets, runs as a
   **non-root user**, and its `CMD` is `node server.js` directly — no
   migration logic lives in this stage; that's the `migrate` service's job
   (see Database above).[^8]

All stages pin an explicit Node base image tag (e.g. `node:20-alpine`), never
`node:latest`, so rebuilds are reproducible.[^21] No environment-specific
values or secrets are baked into any image layer — everything is supplied at
container-start time via `env_file`/compose `environment`.[^9]

## Startup validation & logging

The app validates required env vars (`DATABASE_URL`, `APP_URL`,
`AUTH_SECRET`, `CRON_SECRET`) at startup and fails fast with a clear error
message if any are missing or malformed, rather than surfacing an opaque
failure deep inside Prisma's connection code.[^22] The app logs to
stdout/stderr only (never to a file), so `docker compose logs` and any
future centralized-logging driver work without extra plumbing, per the
guidelines' structured/centralized logging emphasis.[^23]

## Compose file

Three services: `db`, `migrate`, `app`, on a single named bridge network
(`evergrace-net`). **`db` publishes no host port** — it's reachable only from
other services on that network; add a port mapping temporarily only if a
developer needs a local DB client for debugging.[^24]

- `db`: `postgres:16-alpine`, named volume for data persistence, healthcheck
  via `pg_isready`, explicit `deploy.resources.limits` (cpu/mem),
  `restart: unless-stopped`.[^10]
- `migrate`: same image as `app`, command overridden to `prisma migrate
  deploy`, `depends_on: db: condition: service_healthy`, `restart: "no"` (a
  one-shot job should never auto-restart in a loop on failure — see Database
  above).[^20]
- `app`: builds from the Dockerfile, `env_file: .env`, `DATABASE_URL`
  overridden to point at `db:5432` (compose's internal DNS), `depends_on:
  db: condition: service_healthy` and `migrate: condition:
  service_completed_successfully`, port `3000:3000`, explicit resource
  limits, `restart: unless-stopped`, and its own healthcheck against `GET
  /api/health`.[^11] The app container is stateless — no state that must
  survive a restart is written to its local filesystem; everything durable
  lives in Postgres.[^12]
- Seeding is a manual one-off (`docker compose run --rm app npm run
  db:seed`). `prisma/seed.ts` is already documented and written to be
  idempotent (upserts by natural key), so running it more than once is
  safe — it's kept manual/on-demand rather than automatic purely so a
  restart doesn't unexpectedly reseed reference data mid-demo, not because
  a second run would corrupt anything.[^13]

## Health endpoint

Add `GET /api/health`: runs a trivial Prisma query (e.g. `SELECT 1`) and
returns 200/JSON on success, 503 on DB failure. This is a **readiness**
check (is the app + its DB dependency ready to serve traffic), and it's the
one Docker uses for the `app` healthcheck in this spec. It is deliberately
*not* used as a liveness check: if Postgres blips transiently, we don't want
Docker restarting an otherwise-healthy `app` container over it. Splitting
into `/api/health/live` (process-up only, no DB call) vs
`/api/health/ready` (current behavior) is a reasonable follow-up but is
collapsed into the single endpoint for this iteration — noted here so it
isn't mistaken for an oversight later.[^25]

## Security & isolation

- New `.dockerignore` excludes `.env`, `node_modules`, `.next`,
  `prisma/dev.db`, and other dev-only artifacts from the build
  context, so dev secrets can never leak into a built image layer.[^15]
- Runner stage drops to a non-root user before running the app.[^16]
- No secrets appear in the Dockerfile or `docker-compose.yml` themselves —
  only referenced via `env_file`.[^17]

## Env files

`.env.example` gains a documented Postgres `DATABASE_URL` shape for the
Docker Compose setup (e.g. `postgresql://evergrace:evergrace@db:5432/evergrace`),
alongside the existing SQLite default for non-Docker local dev.[^18]

## Out of scope

Rate limiting, CDN/load balancing, multi-region HA/DR, and CI/CD pipeline
changes are covered elsewhere in the guidelines doc but do not apply to a
single-node local `docker compose` artifact — this is not a production
topology change.[^19]

## Known gap: empty companion checklist

`docs/DEV/Robust-Application-Development-Checklist.md` exists but is empty,
so this entire spec is grounded only in the prose guidelines doc. That's a
real gap, not a footnote-level detail: something the checklist would have
called out explicitly (a specific security control, a backup requirement,
etc.) could be missing here without anyone noticing. Populating that
checklist and diffing this spec against it is flagged as a follow-up task
that should happen before — or in parallel with — implementation, not
silently deferred.[^26]

[^1]: existing_codebase
[^2]: human
[^3]: ai_assumption
[^4]: existing_codebase
[^5]: human
[^6]: existing_codebase
[^7]: ai_assumption
[^8]: skill_doc
[^9]: skill_doc
[^10]: skill_doc
[^11]: ai_assumption
[^12]: skill_doc
[^13]: human
[^15]: skill_doc
[^16]: skill_doc
[^17]: skill_doc
[^18]: ai_assumption
[^19]: human
[^20]: human
[^21]: human
[^22]: human
[^23]: human
[^24]: human
[^25]: human
[^26]: human
