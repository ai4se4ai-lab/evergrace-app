import type { Metadata } from "next";

import { TeamManager } from "@/components/admin/team-manager";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Team" };

export default async function AdminTeamPage() {
  await requireAdmin();

  const team = await prisma.teamMember.findMany({ orderBy: { order: "asc" } });

  return (
    <Card>
      <TeamManager
        team={team.map((row) => ({
          id: row.id,
          name: row.name,
          role: row.role,
          bio: row.bio,
          initials: row.initials,
          photoUrl: row.photoUrl,
        }))}
      />
    </Card>
  );
}
