"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleSavedVideo } from "@/actions/member";
import { SAVED_KINDS, type SavedKind } from "@/lib/domain";
import { cn } from "@/lib/utils";

const META: Record<SavedKind, { icon: string; label: string }> = {
  subscribed: { icon: "✓", label: "Subscribed" },
  liked: { icon: "♡", label: "Liked" },
  favorite: { icon: "★", label: "Favorite" },
};

/** Writes SavedVideo rows, which drive the My Library tabs on the dashboard. */
export function SavedVideoControls({
  videoId,
  saved,
}: {
  videoId: string;
  saved: Record<string, boolean>;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState(saved);
  const [, startTransition] = useTransition();

  function toggle(kind: SavedKind) {
    const next = { ...optimistic, [kind]: !optimistic[kind] };
    setOptimistic(next);
    startTransition(async () => {
      await toggleSavedVideo({ videoId, kind });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-semibold text-muted">Save to My Library</span>
      {SAVED_KINDS.map((kind) => {
        const active = Boolean(optimistic[kind]);
        return (
          <button
            key={kind}
            type="button"
            onClick={() => toggle(kind)}
            aria-pressed={active}
            className={cn(
              "inline-flex min-h-touch items-center gap-2 rounded-full border-2 px-4 py-2.5 font-bold",
              active ? "border-accent bg-accent text-white" : "border-line hover:bg-accent-soft",
            )}
          >
            <span aria-hidden>{META[kind].icon}</span> {META[kind].label}
          </button>
        );
      })}
    </div>
  );
}
