import type { Metadata } from "next";
import Link from "next/link";

import { UploadForm } from "@/components/admin/upload-form";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { muxConfigured } from "@/lib/media";

export const metadata: Metadata = { title: "Upload a video" };

export default async function UploadPage() {
  await requireAdmin();

  const [categories, masters, levels] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.master.findMany({ orderBy: { name: "asc" } }),
    prisma.level.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="max-w-[720px]">
      <Link
        href="/admin/videos"
        className="mb-4 inline-flex min-h-touch items-center gap-2 py-2 font-semibold text-accent-dark"
      >
        ‹ Back to catalog
      </Link>

      <Card>
        <h2 className="m-0 mb-1.5 text-[1.6em]">Upload a new video</h2>
        <p className="m-0 mb-6 text-muted">Add it to a category and set who can watch it.</p>

        <UploadForm
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          masters={masters.map((m) => ({ id: m.id, name: m.name }))}
          levels={levels.map((l) => ({ id: l.id, name: l.name }))}
          muxConfigured={muxConfigured}
        />
      </Card>
    </div>
  );
}
