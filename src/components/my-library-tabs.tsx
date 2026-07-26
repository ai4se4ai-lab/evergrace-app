"use client";

import * as Tabs from "@radix-ui/react-tabs";

import { VideoCard } from "@/components/video-card";
import { SAVED_KINDS, type SavedKind } from "@/lib/domain";
import type { DashboardData } from "@/lib/queries";
import { cn } from "@/lib/utils";

const TAB_LABEL: Record<SavedKind, string> = {
  subscribed: "Subscribed",
  liked: "Liked",
  favorite: "Favorites",
};

const TAG_ICON: Record<SavedKind, string> = {
  subscribed: "✓",
  liked: "♡",
  favorite: "★",
};

/** My Library tabs, reading SavedVideo (spec §6.4). */
export function MyLibraryTabs({ library }: { library: DashboardData["library"] }) {
  return (
    <Tabs.Root defaultValue="subscribed">
      <Tabs.List className="mb-6 flex flex-wrap gap-2.5" aria-label="Saved videos">
        {SAVED_KINDS.map((kind) => (
          <Tabs.Trigger
            key={kind}
            value={kind}
            className={cn(
              "min-h-[48px] rounded-full border-2 border-line px-6 py-3 font-bold text-[1.05em]",
              "data-[state=active]:border-accent data-[state=active]:bg-accent data-[state=active]:text-white",
            )}
          >
            {TAB_LABEL[kind]} ({library[kind]?.length ?? 0})
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {SAVED_KINDS.map((kind) => {
        const items = library[kind] ?? [];
        return (
          <Tabs.Content key={kind} value={kind}>
            {items.length === 0 ? (
              <p className="m-0 rounded-card border-2 border-line bg-surface p-8 text-muted">
                Nothing here yet. Open any video and use “Save to My Library” to add it.
              </p>
            ) : (
              <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <VideoCard
                    key={`${kind}-${item.id}`}
                    video={item}
                    variant="compact"
                    progressLabel={item.progressLabel}
                    savedTag={{ icon: TAG_ICON[kind], label: TAB_LABEL[kind] }}
                  />
                ))}
              </div>
            )}
          </Tabs.Content>
        );
      })}
    </Tabs.Root>
  );
}
