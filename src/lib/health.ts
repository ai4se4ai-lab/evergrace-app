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
