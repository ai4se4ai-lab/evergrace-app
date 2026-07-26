import type { Metadata } from "next";

import { MasterManager } from "@/components/admin/category-manager";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Instructors" };

export default async function AdminMastersPage() {
  await requireAdmin();

  const masters = await prisma.master.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { videos: true, follows: true } } },
  });

  return (
    <Card>
      <MasterManager
        rows={masters.map((row) => ({
          id: row.id,
          name: row.name,
          detail: row.style,
          videoCount: row._count.videos,
          followCount: row._count.follows,
        }))}
      />
    </Card>
  );
}
