import { ContentSubTabs } from "@/components/admin/content-sub-tabs";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  const [blog, team, categories, masters] = await Promise.all([
    prisma.blogPost.count(),
    prisma.teamMember.count(),
    prisma.category.count(),
    prisma.master.count(),
  ]);

  return (
    <div>
      <ContentSubTabs counts={{ blog, team, categories, masters }} />
      {children}
    </div>
  );
}
