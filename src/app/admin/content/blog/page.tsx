import type { Metadata } from "next";

import { BlogManager } from "@/components/admin/blog-manager";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Journal posts" };

export default async function AdminBlogPage() {
  await requireAdmin();

  const [posts, categories] = await Promise.all([
    prisma.blogPost.findMany({ orderBy: { publishedAt: "desc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <Card>
      <BlogManager
        posts={posts.map((post) => ({
          id: post.id,
          title: post.title,
          slug: post.slug,
          category: post.category,
          excerpt: post.excerpt,
          body: post.body,
          readMinutes: post.readMinutes,
          thumbnailUrl: post.thumbnailUrl,
          publishedAt: post.publishedAt,
        }))}
        categoryNames={categories.map((c) => c.name)}
      />
    </Card>
  );
}
