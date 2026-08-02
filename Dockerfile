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
