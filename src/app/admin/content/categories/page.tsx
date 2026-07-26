import type { Metadata } from "next";

import { CategoryManager } from "@/components/admin/category-manager";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Focus areas" };

export default async function AdminCategoriesPage() {
  await requireAdmin();

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { videos: true, follows: true } } },
  });

  return (
    <Card>
      <CategoryManager
        rows={categories.map((row) => ({
          id: row.id,
          name: row.name,
          detail: row.blurb || null,
          videoCount: row._count.videos,
          followCount: row._count.follows,
        }))}
      />
    </Card>
  );
}
