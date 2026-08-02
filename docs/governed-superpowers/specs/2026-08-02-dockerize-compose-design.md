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
one (`prisma migrate dev --name init`) against a throwaway local Postgres, and
use `prisma migrate deploy` in the container entrypoint — never manual schema
edits or `db push` in production.[^5] Existing Prisma-level constraints
(FKs, `@unique`, not-null) carry over unchanged.[^6]

## Dockerfile (multi-stage, immutable image)

1. `deps` — installs npm dependencies only.
2. `builder` — copies source, runs `prisma generate` then `next build`.
   Requires adding `output: "standalone"` to `next.config.ts` so the runner
   stage only needs the minimal traced output, not the full `node_modules`
   tree.[^7]
3. `runner` — copies the standalone output + static assets, runs as a
   **non-root user**, and its entrypoint runs `prisma migrate deploy` before
   starting `node server.js`.[^8]

No environment-specific values or secrets are baked into any image layer —
everything is supplied at container-start time via `env_file`/compose
`environment`.[^9]

## Compose file

- `db`: `postgres:16-alpine`, named volume for data persistence, healthcheck
  via `pg_isready`, explicit `deploy.resources.limits` (cpu/mem).[^10]
- `app`: builds from the Dockerfile, `env_file: .env`, `DATABASE_URL`
  overridden to point at `db:5432` (compose's internal DNS), `depends_on: db`
  with `condition: service_healthy`, port `3000:3000`, explicit resource
  limits, and its own healthcheck against `GET /api/health`.[^11] The app
  container is stateless — no state that must survive a restart is written to
  its local filesystem; everything durable lives in Postgres.[^12]
- Seeding is a manual one-off (`docker compose run --rm app npm run
  db:seed`), not run automatically on every container start, so restarts
  don't re-seed or duplicate reference data.[^13]

## New health endpoint

Add `GET /api/health`: runs a trivial Prisma query (e.g. `SELECT 1`) and
returns 200/JSON on success, 503 on DB failure. This gives the `app`
container's Docker healthcheck — and `depends_on: condition:
service_healthy` — something real to gate on, per the guidelines' "everything
observable" and error-tracking sections.[^14]

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

[^1]: existing_codebase
[^2]: human
[^3]: ai_assumption
[^4]: existing_codebase
[^5]: skill_doc
[^6]: existing_codebase
[^7]: ai_assumption
[^8]: skill_doc
[^9]: skill_doc
[^10]: skill_doc
[^11]: ai_assumption
[^12]: skill_doc
[^13]: ai_assumption
[^14]: skill_doc
[^15]: skill_doc
[^16]: skill_doc
[^17]: skill_doc
[^18]: ai_assumption
[^19]: human
