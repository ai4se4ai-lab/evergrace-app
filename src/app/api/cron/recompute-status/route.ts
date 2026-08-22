import { NextResponse, type NextRequest } from "next/server";

import { secretsMatch } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deriveMemberStatus } from "@/lib/domain";
import { env } from "@/lib/env";

/**
 * Nightly member-status recompute (spec §6.9).
 *
 * Member status is *derived*, never stored, so this job does not write anything
 * to `User`. It exists to report the current distribution (for dashboards and
 * alerting) and to prune expired sessions and magic-link tokens. Wire it up
 * with Vercel Cron; the request must carry `x-cron-secret`.
 */
export async function POST(request: NextRequest) {
  const provided = request.headers.get("x-cron-secret");
  if (!env.cronSecret || !provided || !secretsMatch(provided, env.cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const members = await prisma.user.findMany({
    where: { role: "MEMBER" },
    select: { id: true, lastActiveAt: true, progress: { select: { percent: true } } },
  });

  const counts = { ACTIVE: 0, AT_RISK: 0, INACTIVE: 0 };
  for (const member of members) {
    const averageProgress =
      member.progress.length > 0
        ? Math.round(
            member.progress.reduce((sum, p) => sum + p.percent, 0) / member.progress.length,
          )
        : 0;
    counts[deriveMemberStatus({ lastActiveAt: member.lastActiveAt, averageProgress }, now)] += 1;
  }

  const [sessions, tokens] = await Promise.all([
    prisma.session.deleteMany({ where: { expires: { lt: now } } }),
    prisma.magicLinkToken.deleteMany({ where: { expires: { lt: now } } }),
  ]);

  return NextResponse.json({
    ranAt: now.toISOString(),
    members: members.length,
    statuses: counts,
    pruned: { sessions: sessions.count, magicLinkTokens: tokens.count },
  });
}
