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
