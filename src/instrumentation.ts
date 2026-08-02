/**
 * Runs once when a real server instance boots (`next start` / the standalone
 * `server.js`) — unlike a module-level call in src/lib/env.ts, this is NOT
 * invoked during `next build`'s "Collecting page data" phase, so production
 * env validation no longer breaks the build itself.
 *
 * See https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { env, validateBootEnv } = await import("@/lib/env");
    validateBootEnv({
      nodeEnv: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL,
      appUrl: env.appUrl,
      authSecret: env.authSecret,
      cronSecret: env.cronSecret,
    });
  }
}
