import type { Metadata } from "next";
import Link from "next/link";

import { ReadAloudHeading } from "@/components/preferences-provider";
import { VideoCard } from "@/components/video-card";
import { getViewer } from "@/lib/auth";
import { INTENSITIES, INTENSITY_LABEL, STANCES, STANCE_LABEL } from "@/lib/domain";
import { getCatalog, getCatalogFacets } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Video library" };

type Search = {
  focus?: string;
  intensity?: string;
  stance?: string;
  master?: string;
};

/**
 * Filters are query-string driven so every view is shareable, bookmarkable, and
 * server-rendered (spec §6.7).
 */
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const [filters, viewer, facets] = await Promise.all([
    searchParams,
    getViewer(),
    getCatalogFacets(),
  ]);

  const videos = await getCatalog(filters, viewer);
  const activeFilters = Object.entries(filters).filter(([, value]) => Boolean(value));

  return (
    <main className="shell pb-20 pt-11">
      <ReadAloudHeading text="Video library" />

      <h1 className="m-0 mb-1.5 text-[2.4em]">Video Library</h1>
      <p className="mb-7 text-[1.25em] text-muted">
        Every video tells you exactly what to expect before you begin.
      </p>

      <div className="flex flex-col gap-4">
        <FilterRow
          legend="Focus area"
          options={[
            { label: "All videos", href: buildHref(filters, { focus: undefined }) , active: !filters.focus },
            ...facets.categories.map((category) => ({
              label: category.name,
              href: buildHref(filters, { focus: category.name }),
              active: filters.focus === category.name,
            })),
            {
              label: "Seated only",
              href: buildHref(filters, { focus: "Seated" }),
              active: filters.focus === "Seated",
            },
          ]}
        />

        <FilterRow
          legend="Intensity"
          options={[
            { label: "Any", href: buildHref(filters, { intensity: undefined }), active: !filters.intensity },
            ...INTENSITIES.map((intensity) => ({
              label: INTENSITY_LABEL[intensity],
              href: buildHref(filters, { intensity }),
              active: filters.intensity === intensity,
            })),
          ]}
        />

        <FilterRow
          legend="Stance"
          options={[
            { label: "Any", href: buildHref(filters, { stance: undefined }), active: !filters.stance },
            ...STANCES.map((stance) => ({
              label: STANCE_LABEL[stance],
              href: buildHref(filters, { stance }),
              active: filters.stance === stance,
            })),
          ]}
        />

        <FilterRow
          legend="Master"
          options={[
            { label: "Any", href: buildHref(filters, { master: undefined }), active: !filters.master },
            ...facets.masters.map((master) => ({
              label: master.name,
              href: buildHref(filters, { master: master.name }),
              active: filters.master === master.name,
            })),
          ]}
        />
      </div>

      <div className="my-7 flex flex-wrap items-center gap-4">
        <p className="m-0 text-[1.05em] text-muted">
          {activeFilters.length === 0
            ? `Showing all ${videos.length} videos`
            : `Showing ${videos.length} ${videos.length === 1 ? "video" : "videos"}`}
        </p>
        {activeFilters.length > 0 ? (
          <Link href="/library" className="font-bold text-accent-dark underline">
            Clear filters
          </Link>
        ) : null}
      </div>

      {videos.length === 0 ? (
        <p className="rounded-card border-2 border-line bg-surface p-8 text-[1.1em] text-muted">
          Nothing matches those filters yet. Try widening them, or{" "}
          <Link href="/library" className="font-bold text-accent-dark underline">
            browse everything
          </Link>
          .
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </main>
  );
}

function FilterRow({
  legend,
  options,
}: {
  legend: string;
  options: { label: string; href: string; active: boolean }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-[7.5rem] flex-none font-semibold text-muted">{legend}</span>
      {options.map((option) => (
        <Link
          key={`${legend}-${option.label}`}
          href={option.href}
          aria-current={option.active}
          className={cn(
            "min-h-touch rounded-full border-2 px-[18px] py-2.5 font-semibold",
            option.active
              ? "border-accent bg-accent text-white"
              : "border-line text-fg hover:bg-accent-soft",
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}

function buildHref(current: Search, patch: Partial<Search>): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...patch };

  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }

  const query = params.toString();
  return query ? `/library?${query}` : "/library";
}
