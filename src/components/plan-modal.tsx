"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";

import { startPlanChange } from "@/actions/billing";
import { CheckIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  ACCESS_LABEL,
  PLANS,
  PLAN_LABEL,
  planRank,
  requiredPlanFor,
  type AccessLevel,
  type Plan,
} from "@/lib/domain";
import type { PlanCatalogEntry } from "@/lib/queries";
import { cn } from "@/lib/utils";

type LockedContext = { title: string; access: AccessLevel; returnTo?: string };

type PlanModalContextValue = {
  /** Open the plan cards. Pass the locked video to show the 🔒 banner (§6.6). */
  open: (locked?: LockedContext) => void;
};

const PlanModalContext = createContext<PlanModalContextValue | null>(null);

export function usePlanModal(): PlanModalContextValue {
  const context = useContext(PlanModalContext);
  if (!context) throw new Error("usePlanModal must be used inside PlanModalProvider");
  return context;
}

export function PlanModalProvider({
  currentPlan,
  signedIn,
  planCatalog,
  children,
}: {
  currentPlan: Plan;
  signedIn: boolean;
  planCatalog: Record<Plan, PlanCatalogEntry>;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [locked, setLocked] = useState<LockedContext | null>(null);

  const open = useCallback((next?: LockedContext) => {
    setLocked(next ?? null);
    setIsOpen(true);
  }, []);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <PlanModalContext.Provider value={value}>
      {children}
      <PlanModal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        currentPlan={currentPlan}
        signedIn={signedIn}
        locked={locked}
        planCatalog={planCatalog}
      />
    </PlanModalContext.Provider>
  );
}

function PlanModal({
  isOpen,
  onOpenChange,
  currentPlan,
  signedIn,
  locked,
  planCatalog,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: Plan;
  signedIn: boolean;
  locked: LockedContext | null;
  planCatalog: Record<Plan, PlanCatalogEntry>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const neededPlan = locked ? requiredPlanFor(locked.access) : null;

  function choose(plan: Plan) {
    setError(null);

    if (!signedIn) {
      router.push("/login?next=/account");
      return;
    }

    startTransition(async () => {
      try {
        await startPlanChange({ plan, returnTo: locked?.returnTo });
      } catch (cause) {
        // `redirect()` throws by design; anything else is a real failure.
        if (cause instanceof Error && cause.message.includes("NEXT_REDIRECT")) throw cause;
        setError("We couldn’t start that change. Please try again.");
      }
    });
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-[rgba(20,17,14,.55)]" />
        <Dialog.Content className="animate-fadeup fixed left-1/2 top-1/2 z-[91] max-h-[90vh] w-[840px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[22px] border-2 border-line bg-surface p-[34px]">
          <div className="mb-1.5 flex items-start justify-between gap-4">
            <Dialog.Title className="m-0 text-[1.8em]">Choose your plan</Dialog.Title>
            <Dialog.Close
              className="min-h-touch rounded-control px-2.5 text-[1.6em] leading-none text-muted hover:bg-accent-soft"
              aria-label="Close"
            >
              ✕
            </Dialog.Close>
          </div>

          {locked && neededPlan ? (
            <div className="my-2 mb-5 flex items-start gap-3 rounded-[14px] border-2 border-[var(--notice-line)] bg-[var(--notice-bg)] px-[18px] py-4">
              <span className="text-[1.3em]" aria-hidden>
                🔒
              </span>
              <Dialog.Description className="m-0 text-[1.05em] text-[var(--notice-fg)]">
                <strong>{locked.title}</strong> is a {ACCESS_LABEL[locked.access]} video. Upgrade to{" "}
                <strong>{PLAN_LABEL[neededPlan]}</strong> or higher to watch it.
              </Dialog.Description>
            </div>
          ) : (
            <Dialog.Description className="mb-6 mt-1.5 text-[1.1em] text-muted">
              Upgrade any time to unlock more videos. You can change or cancel whenever you like.
            </Dialog.Description>
          )}

          <div className="grid gap-[18px] md:grid-cols-3">
            {PLANS.map((plan) => {
              const isCurrent = plan === currentPlan;
              const isDowngrade = planRank(plan) < planRank(currentPlan);

              return (
                <div
                  key={plan}
                  className={cn(
                    "flex flex-col gap-1.5 rounded-card bg-bg p-[22px]",
                    isCurrent ? "border-[3px] border-accent" : "border-2 border-line",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="m-0 text-[1.4em]">{PLAN_LABEL[plan]}</h3>
                    {isCurrent ? (
                      <span className="rounded-full bg-accent px-2.5 py-[3px] text-[0.78em] font-bold text-white">
                        Current
                      </span>
                    ) : null}
                  </div>
                  <div className="mb-2.5 mt-0.5 text-[1.6em] font-extrabold text-accent-dark">
                    {planCatalog[plan].price}
                  </div>
                  <ul role="list" className="mb-[18px] flex list-none flex-col gap-2 p-0">
                    {planCatalog[plan].perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2">
                        <CheckIcon className="mt-1 flex-none text-success" />
                        {perk}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button variant="outline" size="md" disabled className="mt-auto text-muted">
                      Your current plan
                    </Button>
                  ) : (
                    <Button
                      className="mt-auto"
                      size="md"
                      disabled={pending}
                      onClick={() => choose(plan)}
                    >
                      {pending
                        ? "One moment…"
                        : isDowngrade
                          ? `Switch to ${PLAN_LABEL[plan]}`
                          : `Upgrade to ${PLAN_LABEL[plan]}`}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {error ? (
            <p className="mt-4 font-semibold text-warn" role="alert">
              {error}
            </p>
          ) : null}

          {!signedIn ? (
            <p className="mt-5 text-muted">
              You’ll be asked to sign in first — plans are tied to your account.
            </p>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
