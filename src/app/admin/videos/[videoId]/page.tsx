import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SyllabusBuilder } from "@/components/admin/syllabus-builder";
import { TranscriptEditor } from "@/components/admin/transcript-editor";
import { VideoEditForm } from "@/components/admin/video-edit-form";
import { AccessBadge, VideoStatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getVideoForEdit } from "@/lib/queries";

type Params = { params: Promise<{ videoId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { videoId } = await params;
  const video = await prisma.video.findUnique({ where: { id: videoId } });
  return { title: video ? `Edit ${video.title}` : "Edit video" };
}

export default async function AdminVideoDetailPage({ params }: Params) {
  await requireAdmin();

  const { videoId } = await params;
  const video = await getVideoForEdit(videoId);
  if (!video) notFound();

  const [categories, masters, levels] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.master.findMany({ orderBy: { name: "asc" } }),
    prisma.level.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <div>
      <Link
        href="/admin/videos"
        className="mb-4 inline-flex min-h-touch items-center gap-2 py-2 font-semibold text-accent-dark"
      >
        ‹ Back to catalog
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="m-0 text-[1.8em]">{video.title}</h2>
          <p className="m-0 mt-1.5 flex flex-wrap items-center gap-3 text-muted">
            <VideoStatusBadge status={video.status} />
            <AccessBadge access={video.access} />
            <span>
              Added{" "}
              {video.createdAt.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {video.status === "PUBLISHED" ? (
              <Link href={`/library/${video.slug}`} className="font-bold text-accent-dark underline">
                View as a member
              </Link>
            ) : null}
          </p>
        </div>

        <dl className="flex flex-wrap gap-6">
          <Stat term="In progress" value={video.counts.progress} />
          <Stat term="Saved by" value={video.counts.savedBy} />
          <Stat term="Notified" value={video.counts.notifications} />
        </dl>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <h3 className="m-0 mb-1 text-[1.4em]">Details</h3>
          <p className="m-0 mb-6 text-muted">
            What members see on the card and the player page.
          </p>
          <VideoEditForm
            video={video}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            masters={masters.map((m) => ({ id: m.id, name: m.name }))}
            levels={levels.map((l) => ({ id: l.id, name: l.name }))}
          />
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <h3 className="m-0 mb-1 text-[1.4em]">Roadmap</h3>
            <SyllabusBuilder videoId={video.id} chapters={video.chapters} />
          </Card>

          <Card>
            <h3 className="m-0 mb-1 text-[1.4em]">Transcript</h3>
            <TranscriptEditor videoId={video.id} initialText={video.transcriptText} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ term, value }: { term: string; value: number }) {
  return (
    <div>
      <dt className="text-[0.82em] uppercase tracking-[0.04em] text-muted">{term}</dt>
      <dd className="m-0 text-[1.6em] font-bold leading-none text-accent">{value}</dd>
    </div>
  );
}
