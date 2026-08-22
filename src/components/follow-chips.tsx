"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleFollow } from "@/actions/member";
import { usePlanModal } from "@/components/plan-modal";
import { canFollow, type FollowKind, type Plan } from "@/lib/domain";
import type { DashboardData } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * The subscriptions card (spec §6.5). Basic members see the chips disabled with
 * an upsell — the server enforces the same rule in `toggleFollow`.
 */
export function FollowChips({
  follows,
  plan,
}: {
  follows: DashboardData["follows"];
  plan: Plan;
}) {
  const allowed = canFollow(plan);
  const planModal = usePlanModal();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div>
      {!allowed ? (
        <div className="mb-4 rounded-control border-2 border-[var(--notice-line)] bg-[var(--notice-bg)] px-4 py-3">
          <p className="m-0 text-[var(--notice-fg)]">
            Following skills, masters, and levels is available on the Member and Premium plans.{" "}
            <button
              type="button"
              onClick={() => planModal.open()}
              className="font-bold underline underline-offset-2"
            >
              See plans
            </button>
          </p>
        </div>
      ) : null}

      <Group label="Skills & categories">
        {follows.categories.map((item) => (
          <Chip
            key={item.id}
            kind="CATEGORY"
            targetId={item.id}
            label={item.name}
            following={item.following}
            allowed={allowed}
            onError={setMessage}
          />
        ))}
      </Group>

      <Group label="Masters">
        {follows.masters.map((item) => (
          <Chip
            key={item.id}
            kind="MASTER"
            targetId={item.id}
            label={`Master ${item.name}`}
            following={item.following}
            allowed={allowed}
            onError={setMessage}
          />
        ))}
      </Group>

      <Group label="Levels" last>
        {follows.levels.map((item) => (
          <Chip
            key={item.id}
            kind="LEVEL"
            targetId={item.id}
            label={item.name}
            following={item.following}
            allowed={allowed}
            onError={setMessage}
          />
        ))}
      </Group>

      {message ? (
        <p className="mt-4 font-semibold text-warn" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function Group({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={last ? "" : "mb-5"}>
      <div className="mb-2.5 text-[1.05em] font-bold">{label}</div>
      <div className="flex flex-wrap gap-2.5">{children}</div>
    </div>
  );
}

function Chip({
  kind,
  targetId,
  label,
  following,
  allowed,
  onError,
}: {
  kind: FollowKind;
  targetId: string;
  label: string;
  following: boolean;
  allowed: boolean;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState(following);
  const [, startTransition] = useTransition();

  function toggle() {
    onError(null);
    const next = !optimistic;
    setOptimistic(next);

    startTransition(async () => {
      const result = await toggleFollow({ kind, targetId });
      if (!result.ok) {
        setOptimistic(!next);
        onError(result.message ?? "That didn’t work. Please try again.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!allowed}
      aria-pressed={optimistic}
      title={allowed ? undefined : "Available on the Member and Premium plans"}
      className={cn(
        "inline-flex min-h-touch items-center gap-2 rounded-full border-2 px-4 py-2.5 font-bold text-[0.98em]",
        optimistic ? "border-accent bg-accent text-white" : "border-line text-fg",
        allowed ? "hover:bg-accent-soft hover:text-fg" : "cursor-not-allowed opacity-60",
        optimistic && allowed && "hover:bg-accent-dark hover:text-white",
      )}
    >
      <span aria-hidden>{optimistic ? "✓" : "+"}</span> {label}
    </button>
  );
}
