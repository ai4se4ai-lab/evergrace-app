"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleSavedVideo } from "@/actions/member";
import { LockIcon, PlayIcon } from "@/components/icons";
import { usePlanModal } from "@/components/plan-modal";
import { AccessBadge } from "@/components/ui/badge";
import { INTENSITY_LABEL, SAVED_KINDS, STANCE_LABEL, type SavedKind } from "@/lib/domain";
import type { VideoCard as VideoCardData } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Props = {
  video: VideoCardData;
  /** Shown under the title on the dashboard's "New for you" row. */
  reason?: string;
  /** Shown on the My Library cards. */
  progressLabel?: string;
  savedTag?: { icon: string; label: string };
  variant?: "catalog" | "compact";
  /** Viewer's current SavedVideo state for this video, if signed in. Enables the like/favorite quick actions on the card. */
  saved?: Record<string, boolean>;
};

/** Only Like/Favorite are quick-toggled from the card; "Subscribed" stays on the video detail page to avoid colliding with the "Your subscriptions" follow feature. */
const QUICK_SAVE_KINDS: SavedKind[] = SAVED_KINDS.filter((kind) => kind !== "subscribed");

const QUICK_SAVE_META: Record<SavedKind, { icon: string; activeIcon: string; label: string }> = {
  subscribed: { icon: "+", activeIcon: "✓", label: "Subscribe" },
  liked: { icon: "♡", activeIcon: "♥", label: "Like" },
  favorite: { icon: "☆", activeIcon: "★", label: "Favorite" },
};

/**
 * A single video card. The intensity / stance / focus / duration / access
 * metadata is rendered for locked and unlocked videos alike — the "no
 * surprises" rule in spec §6.7. Pressing a locked card opens the upgrade modal
 * instead of navigating.
 */
export function VideoCard({
  video,
  reason,
  progressLabel,
  savedTag,
  variant = "catalog",
  saved,
}: Props) {
  const router = useRouter();
  const planModal = usePlanModal();

  function activate() {
    if (video.locked) {
      planModal.open({
        title: video.title,
        access: video.access,
        returnTo: `/library/${video.slug}`,
      });
      return;
    }
    router.push(`/library/${video.slug}`);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={onKeyDown}
      className="flex flex-col overflow-hidden rounded-[18px] border-2 border-line bg-surface text-left transition-transform hover:-translate-y-[3px] hover:border-accent"
    >
      <div
        className={cn(
          "placeholder-art relative flex items-center justify-center",
          variant === "catalog" ? "h-40" : "h-[150px]",
        )}
      >
        <span className="absolute right-3 top-3 rounded-full bg-[rgba(44,40,36,.78)] px-3 py-[5px] text-[0.9em] font-semibold text-white">
          {video.durationLabel}
        </span>

        {savedTag ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[rgba(251,248,242,.94)] px-3 py-[5px] text-[0.85em] font-bold text-accent-dark">
            <span aria-hidden>{savedTag.icon}</span> {savedTag.label}
          </span>
        ) : (
          <AccessBadge access={video.access} className="absolute left-3 top-3" />
        )}

        <span
          className={cn(
            "flex items-center justify-center rounded-full",
            variant === "catalog" ? "h-14 w-14" : "h-[52px] w-[52px]",
            video.locked
              ? "bg-[rgba(44,40,36,.72)] text-white"
              : "bg-[rgba(251,248,242,.92)] text-accent",
          )}
        >
          {video.locked ? <LockIcon size={24} /> : <PlayIcon size={24} />}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 px-5 pb-6 pt-5">
        <h3 className="m-0 text-[1.25em] leading-tight">{video.title}</h3>

        {reason ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-[0.92em] text-accent-dark">
            <span aria-hidden>🔔</span> {reason}
          </span>
        ) : null}

        {variant === "catalog" ? (
          <dl className="mt-auto grid grid-cols-2 gap-x-3.5 gap-y-2.5">
            <Meta term="Intensity" value={INTENSITY_LABEL[video.intensity]} />
            <Meta term="Stance" value={STANCE_LABEL[video.stance]} />
            <Meta term="Focus" value={video.categoryName} />
            <Meta term="Length" value={video.durationLabel} />
          </dl>
        ) : (
          <p className="m-0 text-[0.98em] text-muted">
            {video.masterName ? `Master ${video.masterName}` : video.categoryName}
          </p>
        )}

        {progressLabel ? (
          <div className="mt-1">
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <div
                className={cn(
                  "h-full rounded-full",
                  video.percent >= 100 ? "bg-success" : "bg-accent",
                )}
                style={{ width: `${video.percent}%` }}
              />
            </div>
            <span className="mt-1.5 block text-[0.92em] text-muted">{progressLabel}</span>
          </div>
        ) : null}

        {video.locked ? (
          <span className="font-bold text-[0.95em] text-warn">🔒 Upgrade to watch</span>
        ) : null}

        {saved ? (
          <div className="mt-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {QUICK_SAVE_KINDS.map((kind) => (
              <QuickSaveButton key={kind} videoId={video.id} kind={kind} initialActive={Boolean(saved[kind])} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function QuickSaveButton({
  videoId,
  kind,
  initialActive,
}: {
  videoId: string;
  kind: SavedKind;
  initialActive: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [, startTransition] = useTransition();
  const meta = QUICK_SAVE_META[kind];

  function toggle() {
    const next = !active;
    setActive(next);
    startTransition(async () => {
      const result = await toggleSavedVideo({ videoId, kind });
      if (!result.ok) {
        setActive(!next);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      aria-label={`${active ? "Remove from" : "Add to"} ${meta.label}`}
      className={cn(
        "inline-flex min-h-touch items-center gap-1.5 rounded-full border-2 px-3.5 py-2 text-[0.92em] font-bold",
        active ? "border-accent bg-accent text-white" : "border-line text-fg hover:bg-accent-soft",
      )}
    >
      <span aria-hidden>{active ? meta.activeIcon : meta.icon}</span> {meta.label}
    </button>
  );
}

function Meta({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.82em] uppercase tracking-[0.04em] text-muted">{term}</dt>
      <dd className="m-0 text-[1.02em] font-semibold">{value}</dd>
    </div>
  );
}
