import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LockedStage } from "@/components/player/locked-stage";
import { PlayerStage } from "@/components/player/player-stage";
import { Syllabus } from "@/components/player/syllabus";
import { ReadAloudHeading } from "@/components/preferences-provider";
import { SavedVideoControls } from "@/components/saved-video-controls";
import { AccessBadge } from "@/components/ui/badge";
import { getViewer } from "@/lib/auth";
import { INTENSITY_LABEL, STANCE_LABEL } from "@/lib/domain";
import { getVideoDetail } from "@/lib/queries";

type Params = { params: Promise<{ videoId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { videoId } = await params;
  const viewer = await getViewer();
  const video = await getVideoDetail(videoId, viewer);
  return { title: video?.title ?? "Video" };
}

export default async function VideoPage({ params }: Params) {
  const [{ videoId }, viewer] = await Promise.all([params, getViewer()]);
  const video = await getVideoDetail(videoId, viewer);
  if (!video) notFound();

  const signedIn = Boolean(viewer);

  return (
    <main className="mx-auto max-w-[1320px] px-7 pb-20 pt-7">
      <ReadAloudHeading text={`Now playing, ${video.title}`} />

      <Link
        href="/library"
        className="mb-3.5 inline-flex min-h-touch items-center gap-2 py-2 font-semibold text-[1.1em] text-accent-dark"
      >
        ‹ Back to library
      </Link>

      <div className="grid items-start gap-7 lg:grid-cols-[1.55fr_1fr]">
        <div>
          {video.locked ? (
            <LockedStage
              title={video.title}
              slug={video.slug}
              access={video.access}
              signedIn={signedIn}
            />
          ) : (
            <PlayerStage video={video} signedIn={signedIn} />
          )}

          {/* Details are always shown, locked or not — "no surprises" (§6.7). */}
          <section className="mt-6 rounded-[18px] border-2 border-line bg-surface px-[26px] py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="m-0 text-[1.8em]">{video.title}</h1>
                <p className="m-0 mt-1.5 text-[1.05em] text-muted">{video.metaLine}</p>
              </div>
              <AccessBadge access={video.access} />
            </div>

            {video.summary ? (
              <p className="mb-0 mt-4 max-w-prose text-[1.08em]">{video.summary}</p>
            ) : null}

            <dl className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              <Detail term="Intensity" value={INTENSITY_LABEL[video.intensity]} />
              <Detail term="Stance" value={STANCE_LABEL[video.stance]} />
              <Detail term="Focus" value={video.categoryName} />
              <Detail term="Length" value={video.durationLabel} />
              {video.masterName ? (
                <Detail term="Master" value={`Master ${video.masterName}`} />
              ) : null}
              {video.levelName ? <Detail term="Level" value={video.levelName} /> : null}
            </dl>

            {signedIn ? (
              <div className="mt-6 border-t border-line pt-5">
                <SavedVideoControls videoId={video.id} saved={video.saved} />
              </div>
            ) : null}
          </section>
        </div>

        {video.chapters.length > 0 ? (
          <Syllabus
            chapters={video.chapters}
            lessonsDone={video.lessonsDone}
            lessonsTotal={video.lessonsTotal}
            signedIn={signedIn}
          />
        ) : null}
      </div>
    </main>
  );
}

function Detail({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.82em] uppercase tracking-[0.04em] text-muted">{term}</dt>
      <dd className="m-0 mt-0.5 text-[1.05em] font-semibold">{value}</dd>
    </div>
  );
}
