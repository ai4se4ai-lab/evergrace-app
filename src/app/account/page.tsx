import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/actions/auth";
import { ManagePlanButton } from "@/components/manage-plan-button";
import { ReadAloudHeading } from "@/components/preferences-provider";
import { Button } from "@/components/ui/button";
import { PlanBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getViewer } from "@/lib/auth";
import { billing } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { PLAN_PERKS, PLAN_PRICE, PLAN_UNLOCKS, TRACK_DESCRIPTION, TRACK_LABEL } from "@/lib/domain";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string; cancelled?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/account");

  const [{ upgraded, cancelled }, checkIn] = await Promise.all([
    searchParams,
    prisma.healthCheckIn.findUnique({ where: { userId: viewer.id } }),
  ]);

  return (
    <main className="mx-auto max-w-[900px] px-7 pb-20 pt-11">
      <ReadAloudHeading text="Your account" />

      <h1 className="m-0 mb-1.5 text-[2.4em]">Your account</h1>
      <p className="mb-8 text-[1.25em] text-muted">
        Your plan, your track, and how to sign out.
      </p>

      {upgraded ? (
        <p className="mb-6 rounded-card border-2 border-success bg-success-soft px-5 py-4 font-semibold text-success">
          ✓ Your plan is updated. New videos are unlocked right away.
        </p>
      ) : null}
      {cancelled ? (
        <p className="mb-6 rounded-card border-2 border-line bg-surface px-5 py-4 text-muted">
          No changes were made — you’re still on the {PLAN_PRICE[viewer.plan]} plan.
        </p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <h2 className="m-0 mb-1.5 text-[1.35em]">Your plan</h2>
          <PlanBadge plan={viewer.plan} className="mt-2 self-start text-[0.95em]" />
          <p className="mt-3.5 text-[1.02em] text-muted">{PLAN_UNLOCKS[viewer.plan]}</p>
          <ul role="list" className="mb-6 mt-2 flex list-none flex-col gap-2 p-0">
            {PLAN_PERKS[viewer.plan].map((perk) => (
              <li key={perk} className="flex gap-2">
                <span className="text-success" aria-hidden>
                  ✓
                </span>
                {perk}
              </li>
            ))}
          </ul>
          <ManagePlanButton className="mt-auto w-full" />
          <p className="m-0 mt-3 text-[0.92em] text-muted">
            {billing.name === "stripe"
              ? "Payments and cancellation are handled by Stripe."
              : "Local mode: plan changes apply immediately without a payment step. See docs/INTEGRATIONS.md."}
          </p>
        </Card>

        <Card className="flex flex-col">
          <h2 className="m-0 mb-1.5 text-[1.35em]">Your track</h2>
          {viewer.track ? (
            <>
              <span className="mt-2 self-start rounded-full bg-accent-soft px-4 py-2 font-semibold text-accent-dark">
                {TRACK_LABEL[viewer.track]}
              </span>
              <p className="mt-3.5 text-[1.02em] text-muted">
                {TRACK_DESCRIPTION[viewer.track]}
              </p>
              {checkIn ? (
                <p className="m-0 mt-auto text-[0.95em] text-muted">
                  Last answered{" "}
                  {checkIn.answeredAt.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  .
                </p>
              ) : null}
              <Link
                href="/onboarding"
                className="mt-4 font-bold text-accent-dark underline underline-offset-[3px]"
              >
                Retake the health check-in
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-muted">
                You haven’t taken the health check-in yet. It’s four questions and it decides which
                movements we suggest.
              </p>
              <Link
                href="/onboarding"
                className="mt-auto font-bold text-accent-dark underline underline-offset-[3px]"
              >
                Take the check-in
              </Link>
            </>
          )}
        </Card>

        <Card className="md:col-span-2">
          <h2 className="m-0 mb-1.5 text-[1.35em]">Sign-in details</h2>
          <p className="m-0 text-[1.02em] text-muted">
            You sign in with a magic link sent to <strong className="text-fg">{viewer.email}</strong>{" "}
            — there is no password to remember.
          </p>
          <form action={signOut} className="mt-6">
            <Button type="submit" variant="outline" size="lg">
              Sign out
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
