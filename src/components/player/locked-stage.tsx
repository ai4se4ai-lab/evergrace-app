"use client";

import { LockIcon } from "@/components/icons";
import { usePlanModal } from "@/components/plan-modal";
import { Button, ButtonLink } from "@/components/ui/button";
import { ACCESS_LABEL, PLAN_LABEL, requiredPlanFor, type AccessLevel } from "@/lib/domain";

/**
 * Locked playback surface. The Mux/source URL never reaches this component —
 * `getVideoDetail` strips it server-side — so this is a presentation of a
 * decision already enforced, not the enforcement itself (spec §6.7).
 */
export function LockedStage({
  title,
  slug,
  access,
  signedIn,
}: {
  title: string;
  slug: string;
  access: AccessLevel;
  signedIn: boolean;
}) {
  const planModal = usePlanModal();
  const neededPlan = requiredPlanFor(access);

  return (
    <div className="overflow-hidden rounded-[18px] border-2 border-line">
      <div className="flex aspect-video flex-col items-center justify-center gap-5 bg-[repeating-linear-gradient(45deg,#3a342d,#3a342d_16px,#332e28_16px,#332e28_32px)] px-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(44,40,36,.72)] text-white">
          <LockIcon size={30} />
        </span>
        <p className="m-0 max-w-[40ch] text-[1.2em] font-semibold text-white">
          {title} is a {ACCESS_LABEL[access]} video.
        </p>
        <p className="m-0 max-w-[44ch] text-[#d8cebd]">
          {signedIn
            ? `Upgrade to ${PLAN_LABEL[neededPlan]} or higher to watch it. Everything else on this page — the transcript, roadmap, and details — stays visible.`
            : "Log in or create a free account to see what your plan unlocks."}
        </p>

        {signedIn ? (
          <Button
            size="lg"
            onClick={() =>
              planModal.open({ title, access, returnTo: `/library/${slug}` })
            }
          >
            See plans
          </Button>
        ) : (
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href={`/login?next=/library/${slug}`} size="lg">
              Log in
            </ButtonLink>
            <ButtonLink
              href="/onboarding"
              size="lg"
              variant="ghost"
              className="border-2 border-white/40 text-white hover:bg-white/10"
            >
              Create a free account
            </ButtonLink>
          </div>
        )}
      </div>
    </div>
  );
}
