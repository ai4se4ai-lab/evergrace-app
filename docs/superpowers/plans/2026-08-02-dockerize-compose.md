# Dockerize EverGrace with Docker Compose Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Containerize the EverGrace Next.js app and run it via `docker compose` with a Postgres database, versioned migrations, a health-gated startup sequence, and no secrets baked into any image.

**Architecture:** Three Compose services — `db` (Postgres 16), a one-shot `migrate` service that runs `prisma migrate deploy` and must exit 0 before `app` starts, and `app` (Next.js standalone production build). `migrate` builds from the Dockerfile's `builder` stage (full `node_modules`, has the `prisma` CLI); `app` builds from the leaner `runner` stage. Both share a private bridge network; only `app` publishes a host port.

**Tech Stack:** Next.js 15 (App Router, standalone output), Prisma 6 + `@prisma/client`, PostgreSQL 16, Docker / Docker Compose, Vitest.

**Reference:** `docs/governed-superpowers/specs/2026-08-02-dockerize-compose-design.md` (source of truth for every decision below — cite it if a step here seems to need justification).

**Not part of this plan:** `docs/DEV/Robust-Application-Development-Checklist.md` is empty. Per the spec's "Known gap" section, populating it and diffing this work against it is a separate follow-up — flag it to the user after this plan is executed, don't attempt it here.

---

### Task 1: Switch Prisma to PostgreSQL

**Files:**
- Modify: `prisma/schema.prisma:1-21`
- Modify: `.env:1`
- Modify: `.env.example:5-7`

- [ ] **Step 1: Change the datasource provider**

Edit `prisma/schema.prisma`, replacing the `datasource` block:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Also update the "PROVIDER NOTE" comment at the top of the file (lines 1-12) — it currently says the MVP ships on SQLite and describes switching to Postgres as a future step. Replace it with:

```prisma
// EverGrace data model — implements PROJECT_SPEC.md §4.
//
// Runs on PostgreSQL (see docker-compose.yml and docs/DEPLOYMENT.md). SQLite
// has no native enum type, so every field the spec declares as an enum is
// still stored as a String whose allowed values are defined once in
// src/lib/domain.ts (Plan, AccessLevel, VideoStatus, Track, MemberStatus,
// Role, FollowKind, Intensity, Stance) and validated with Zod at every write
// boundary — promoting these columns to real Postgres enums (see
// docs/DEPLOYMENT.md) is optional and not required for this migration.
```

- [ ] **Step 2: Update `.env.example`'s `DATABASE_URL` documentation**

Edit `.env.example:5-7`, replacing:

```
# MVP default is a local SQLite file. To move to Postgres, see
# docs/DEPLOYMENT.md (swap the `provider` in prisma/schema.prisma).
DATABASE_URL="file:./dev.db"
```

with:

```
# Postgres connection string. Running via `docker compose up`, the app
# container overrides this to point at the `db` service — see
# docker-compose.yml and docs/DEPLOYMENT.md. For non-Docker local dev,
# point this at your own Postgres instance (e.g. by temporarily publishing
# the `db` service's port — see docs/DEPLOYMENT.md).
DATABASE_URL="postgresql://evergrace:evergrace@localhost:5432/evergrace"
```

- [ ] **Step 3: Update your local `.env`**

Edit `.env:1`, replacing `DATABASE_URL="file:./dev.db"` with:

```
DATABASE_URL="postgresql://evergrace:evergrace@localhost:5432/evergrace"
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma .env.example
git commit -m "Switch Prisma datasource from SQLite to PostgreSQL"
```

(`.env` is gitignored — nothing to add there.)

---

### Task 2: Generate the first Prisma migration

No migrations exist yet — schema changes so far have only used `prisma db push`. Production (`prisma migrate deploy`, run by the `migrate` service in Task 8) needs a real migration to apply.

**Files:**
- Create: `prisma/migrations/<timestamp>_init/migration.sql` (generated, not hand-written)
- Create: `prisma/migrations/migration_lock.toml` (generated)

- [ ] **Step 1: Start a throwaway Postgres container**

```bash
docker run --rm -d --name evergrace-migrate-tmp \
  -e POSTGRES_USER=evergrace -e POSTGRES_PASSWORD=evergrace -e POSTGRES_DB=evergrace \
  -p 5433:5432 postgres:16-alpine
```

Wait for it to accept connections:

```bash
docker exec evergrace-migrate-tmp sh -c 'until pg_isready -U evergrace; do sleep 1; done'
```

Expected: eventually prints `... accepting connections`.

- [ ] **Step 2: Generate the migration**

```bash
DATABASE_URL="postgresql://evergrace:evergrace@localhost:5433/evergrace" npx prisma migrate dev --name init
```

Expected: prints `The migration has been created and applied...`, and `prisma/migrations/<timestamp>_init/migration.sql` now exists.

- [ ] **Step 3: Tear down the throwaway container**

```bash
docker stop evergrace-migrate-tmp
```

- [ ] **Step 4: Commit the generated migration**

```bash
git add prisma/migrations
git commit -m "Add initial Prisma migration for PostgreSQL"
```

---

### Task 3: Enable Next.js standalone output

**Files:**
- Modify: `next.config.ts:3-12`

- [ ] **Step 1: Add `output: "standalone"`**

Edit `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // The prototype's static reference files live at the repo root and are not
  // part of the Next build. Keep the build surface to src/ + prisma/.
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // Server Actions are used for every mutation that does not need a webhook.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
```

- [ ] **Step 2: Verify the standalone build output**

```bash
npm run build
```

Expected: build succeeds, and `.next/standalone/server.js` now exists (check with `ls .next/standalone`).

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "Enable Next.js standalone output for the Docker runtime image"
```

---

### Task 4: Env boot validation (TDD)

Extracts a pure, testable function from the existing inline production check in `src/lib/env.ts`, and extends it to cover `DATABASE_URL`, `APP_URL`, and `CRON_SECRET` in production — not just `AUTH_SECRET`.

**Files:**
- Modify: `src/lib/env.ts:38-48`
- Create: `src/lib/env.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/env.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { validateBootEnv } from "./env";

describe("validateBootEnv", () => {
  it("does nothing outside production", () => {
    expect(() =>
      validateBootEnv({
        nodeEnv: "development",
        databaseUrl: undefined,
        appUrl: "http://localhost:3000",
        authSecret: "evergrace-insecure-dev-secret",
        cronSecret: undefined,
      }),
    ).not.toThrow();
  });

  it("throws when DATABASE_URL is missing in production", () => {
    expect(() =>
      validateBootEnv({
        nodeEnv: "production",
        databaseUrl: undefined,
        appUrl: "https://app.evergrace.example",
        authSecret: "real-secret",
        cronSecret: "real-cron",
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it("throws when APP_URL is still the localhost default in production", () => {
    expect(() =>
      validateBootEnv({
        nodeEnv: "production",
        databaseUrl: "postgresql://x",
        appUrl: "http://localhost:3000",
        authSecret: "real-secret",
        cronSecret: "real-cron",
      }),
    ).toThrow(/APP_URL/);
  });

  it("throws when AUTH_SECRET is the insecure default in production", () => {
    expect(() =>
      validateBootEnv({
        nodeEnv: "production",
        databaseUrl: "postgresql://x",
        appUrl: "https://app.evergrace.example",
        authSecret: "evergrace-insecure-dev-secret",
        cronSecret: "real-cron",
      }),
    ).toThrow(/AUTH_SECRET/);
  });

  it("throws when CRON_SECRET is missing in production", () => {
    expect(() =>
      validateBootEnv({
        nodeEnv: "production",
        databaseUrl: "postgresql://x",
        appUrl: "https://app.evergrace.example",
        authSecret: "real-secret",
        cronSecret: undefined,
      }),
    ).toThrow(/CRON_SECRET/);
  });

  it("collects every problem in one error when several vars are invalid", () => {
    expect(() =>
      validateBootEnv({
        nodeEnv: "production",
        databaseUrl: undefined,
        appUrl: "http://localhost:3000",
        authSecret: "evergrace-insecure-dev-secret",
        cronSecret: undefined,
      }),
    ).toThrow(/DATABASE_URL[\s\S]*APP_URL[\s\S]*AUTH_SECRET[\s\S]*CRON_SECRET/);
  });

  it("passes when everything required is set correctly in production", () => {
    expect(() =>
      validateBootEnv({
        nodeEnv: "production",
        databaseUrl: "postgresql://x",
        appUrl: "https://app.evergrace.example",
        authSecret: "real-secret",
        cronSecret: "real-cron",
      }),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/lib/env.test.ts
```

Expected: FAIL — `validateBootEnv` is not exported from `./env` yet.

- [ ] **Step 3: Implement `validateBootEnv` and wire it in**

Edit `src/lib/env.ts`, replacing the trailing production check (currently lines 44-48: the `if (isProduction && env.authSecret === ...)` block) with:

```typescript
export function validateBootEnv(input: {
  nodeEnv: string | undefined;
  databaseUrl: string | undefined;
  appUrl: string;
  authSecret: string;
  cronSecret: string | undefined;
}): void {
  if (input.nodeEnv !== "production") return;

  const problems: string[] = [];
  if (!input.databaseUrl || input.databaseUrl.trim().length === 0) {
    problems.push("DATABASE_URL must be set in production.");
  }
  if (!input.appUrl || input.appUrl === "http://localhost:3000") {
    problems.push("APP_URL must be set to the deployed origin in production.");
  }
  if (input.authSecret === "evergrace-insecure-dev-secret") {
    problems.push("AUTH_SECRET must be set in production.");
  }
  if (!input.cronSecret) {
    problems.push("CRON_SECRET must be set in production.");
  }

  if (problems.length > 0) {
    throw new Error(`Invalid production environment:\n- ${problems.join("\n- ")}`);
  }
}

// Fail loudly at boot rather than discovering a missing/insecure production
// value deep inside Prisma or a signed-cookie mismatch later.
validateBootEnv({
  nodeEnv: process.env.NODE_ENV,
  databaseUrl: process.env.DATABASE_URL,
  appUrl: env.appUrl,
  authSecret: env.authSecret,
  cronSecret: env.cronSecret,
});
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run src/lib/env.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/env.ts src/lib/env.test.ts
git commit -m "Add fail-fast production env validation"
```

---

### Task 5: Database readiness check (TDD)

**Files:**
- Create: `src/lib/health.ts`
- Create: `src/lib/health.test.ts`
- Create: `src/app/api/health/route.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/health.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { $queryRaw: vi.fn() },
}));

import { prisma } from "@/lib/db";
import { checkDatabaseHealth } from "./health";

describe("checkDatabaseHealth", () => {
  it("returns ok:true when the query succeeds", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ "?column?": 1 }]);
    await expect(checkDatabaseHealth()).resolves.toEqual({ ok: true });
  });

  it("returns ok:false with the error message when the query fails", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error("connection refused"));
    await expect(checkDatabaseHealth()).resolves.toEqual({
      ok: false,
      error: "connection refused",
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/health.test.ts
```

Expected: FAIL — `./health` module does not exist yet.

- [ ] **Step 3: Implement `checkDatabaseHealth`**

Create `src/lib/health.ts`:

```typescript
import { prisma } from "@/lib/db";

/**
 * Readiness check: is the app's database dependency reachable right now?
 * Deliberately not a liveness check — see docs/DEPLOYMENT.md.
 */
export async function checkDatabaseHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/health.test.ts
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Add the route**

Create `src/app/api/health/route.ts`:

```typescript
import { NextResponse } from "next/server";

import { checkDatabaseHealth } from "@/lib/health";

/**
 * Readiness probe used by the `app` service's Docker healthcheck
 * (docker-compose.yml). Not a liveness check — see docs/DEPLOYMENT.md.
 */
export async function GET() {
  const health = await checkDatabaseHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/health.ts src/lib/health.test.ts src/app/api/health/route.ts
git commit -m "Add /api/health readiness endpoint"
```

---

### Task 6: Dockerfile

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Write the Dockerfile**

Create `Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1

# ---- deps: install exactly what package-lock.json pins -------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: full node_modules (needed for the Prisma CLI + tsx) --------
# Also used directly (via `target: builder` in docker-compose.yml) as the
# `migrate` service's image, since `prisma migrate deploy` and
# `npm run db:seed` both need devDependencies not present in `runner`.
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runner: minimal production image -------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Next.js standalone output traces only the dependencies the server actually
# needs, so this image never contains devDependencies (prisma CLI, tsx,
# typescript) or the full source tree.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# No curl/wget in alpine by default; use Node itself for the healthcheck.
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
```

> Note: there's no `public/` directory in this repo yet, so there's no `COPY --from=builder /app/public ./public` line. If one is added later, add that COPY line back in the `runner` stage.

- [ ] **Step 2: Build the runner image to verify it compiles**

```bash
docker build --target runner -t evergrace-app:local .
```

Expected: build succeeds (this also exercises `prisma generate` and `next build` inside the `builder` stage).

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "Add multi-stage Dockerfile for the Next.js standalone build"
```

---

### Task 7: .dockerignore

**Files:**
- Create: `.dockerignore`

- [ ] **Step 1: Write it**

Create `.dockerignore`:

```
node_modules
.next
.git
.env
.env.local
.env*.local
prisma/dev.db
prisma/dev.db-journal
prisma/*.db
prisma/*.db-journal
coverage
test-results
playwright-report
e2e
.thumbnail
*.tsbuildinfo
npm-debug.log*
```

- [ ] **Step 2: Verify secrets are excluded from the build context**

```bash
docker build --target builder -t evergrace-builder:check --progress=plain . 2>&1 | grep -i "\.env" || echo "no .env in build output"
```

Expected: `no .env in build output`.

- [ ] **Step 3: Commit**

```bash
git add .dockerignore
git commit -m "Add .dockerignore to keep dev secrets and artifacts out of image layers"
```

---

### Task 8: docker-compose.yml

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Write it**

Create `docker-compose.yml`:

```yaml
networks:
  evergrace-net:
    driver: bridge

volumes:
  pgdata:

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: evergrace
      POSTGRES_PASSWORD: evergrace
      POSTGRES_DB: evergrace
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - evergrace-net
    # No `ports:` mapping on purpose — db is reachable only from other
    # services on evergrace-net. Add a temporary port mapping here only if
    # you need a local DB client for debugging (see docs/DEPLOYMENT.md).
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U evergrace -d evergrace"]
      interval: 5s
      timeout: 5s
      retries: 10
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M

  migrate:
    build:
      context: .
      target: builder
    command: npx prisma migrate deploy
    restart: "no"
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql://evergrace:evergrace@db:5432/evergrace
    depends_on:
      db:
        condition: service_healthy
    networks:
      - evergrace-net

  app:
    build:
      context: .
      target: runner
    restart: unless-stopped
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql://evergrace:evergrace@db:5432/evergrace
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
    networks:
      - evergrace-net
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"]
      interval: 10s
      timeout: 5s
      start_period: 15s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "Add docker-compose.yml with db, migrate, and app services"
```

---

### Task 9: Full-stack verification

No unit test exercises container orchestration, so this task is a scripted manual verification instead — every command has an expected, checkable result.

**Files:** none (verification only)

- [ ] **Step 1: Build all images**

```bash
docker compose build
```

Expected: both `migrate`/`app` (same Dockerfile, different targets) and the pull of `postgres:16-alpine` succeed.

- [ ] **Step 2: Bring up `db`, wait for healthy**

```bash
docker compose up -d db
docker compose ps db
```

Expected: `STATUS` eventually shows `healthy`.

- [ ] **Step 3: Run migrations and confirm a clean exit**

```bash
docker compose up migrate
docker compose ps -a migrate
```

Expected: `migrate` logs show `The following migration(s) have been applied` (or "No pending migrations"), and `docker compose ps -a migrate` shows `Exit 0`.

- [ ] **Step 4: Confirm a bad migration fails loudly (negative-path check)**

```bash
docker compose run --rm -e DATABASE_URL="postgresql://evergrace:evergrace@nonexistent-host:5432/evergrace" migrate
echo "exit code: $?"
```

Expected: non-zero exit code, connection-error output — confirms `migrate` does not silently succeed on failure, and (per the compose `depends_on: condition: service_completed_successfully`) `app` would never start after this.

- [ ] **Step 5: Bring up `app` and confirm it becomes healthy**

```bash
docker compose up -d app
docker compose ps app
```

Expected: `STATUS` eventually shows `healthy`.

- [ ] **Step 6: Hit the health endpoint from the host**

```bash
curl -i http://localhost:3000/api/health
```

Expected: `HTTP/1.1 200 OK` with body `{"ok":true}`.

- [ ] **Step 7: Seed reference data via the `migrate` image (has `tsx`, unlike `app`'s slim runtime image)**

```bash
docker compose run --rm migrate npx tsx prisma/seed.ts
```

Expected: seed script logs its usual "seeded N categories / M masters / ..." summary and exits 0.

- [ ] **Step 8: Confirm data persists across an app restart**

```bash
docker compose restart app
curl -s http://localhost:3000/api/health
```

Expected: still `{"ok":true}` — confirms Postgres data survived the `app` container's restart (state lives in the `pgdata` volume, not the `app` container).

- [ ] **Step 9: Confirm `db` is not reachable from the host**

```bash
docker compose port db 5432 || echo "db has no published port, as expected"
```

Expected: `db has no published port, as expected`.

- [ ] **Step 10: Confirm logs go to stdout/stderr, not a file**

```bash
docker compose logs app | tail -20
```

Expected: request/build logs appear here (Next.js logs to stdout/stderr by
default — no code change was needed for this; this step just confirms
`docker compose logs` actually captures them, satisfying the "centralized
logging" requirement in `docs/DEV/Robust-Application-Development-Guidelines.md`).

- [ ] **Step 11: Tear down**

```bash
docker compose down
```

(Use `docker compose down -v` only if you also want to discard the seeded Postgres volume — not needed for this verification.)

---

### Task 10: Document the Docker Compose workflow

**Files:**
- Modify: `docs/DEPLOYMENT.md`

- [ ] **Step 1: Add a "Docker Compose (local)" section**

Insert this new section into `docs/DEPLOYMENT.md`, right after the `## Moving from SQLite to PostgreSQL` section (after line 51, before `## Vercel`):

```markdown
## Docker Compose (local)

The repo ships a `docker-compose.yml` with three services: `db` (Postgres
16), `migrate` (one-shot `prisma migrate deploy`, must exit 0 before `app`
starts), and `app` (the Next.js production build). `db` publishes no host
port — it's reachable only from `migrate`/`app` on the internal
`evergrace-net` network. Add a port mapping to `db` temporarily if you need
a local DB client for debugging.

```bash
docker compose build
docker compose up -d db
docker compose up migrate        # applies pending migrations, exits 0 on success
docker compose up -d app
curl http://localhost:3000/api/health
```

Seed reference data (categories, masters, demo roster) — safe to run more
than once, `prisma/seed.ts` upserts by natural key:

```bash
docker compose run --rm migrate npx tsx prisma/seed.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/DEPLOYMENT.md
git commit -m "Document the Docker Compose local workflow"
```

---

## Follow-up (not part of this plan)

`docs/DEV/Robust-Application-Development-Checklist.md` is empty. Per the
design spec's "Known gap" section, someone should populate it and diff this
implementation against it — flag this to the user once this plan is done;
don't attempt it as part of this work.
