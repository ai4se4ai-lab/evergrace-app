import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { confirmMockPlanChange } from "@/actions/billing";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth";
import { billing } from "@/lib/billing";
import { PLANS, PLAN_LABEL, PLAN_PRICE, type Plan } from "@/lib/domain";

export const metadata: Metadata = { title: "Confirm your plan" };

/**
 * Stand-in for Stripe Checkout when Stripe is not configured. It exists so the
 * plan-change flow is genuinely exercisable in local mode; the plan is still
 * only written by the billing layer, never by the client.
 */
export default async function ConfirmPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; returnTo?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/account");
  if (billing.name !== "mock") redirect("/account");

  const { plan: planParam, returnTo } = await searchParams;
  if (!planParam || !PLANS.includes(planParam as Plan)) notFound();
  const plan = planParam as Plan;

  async function confirm() {
    "use server";
    await confirmMockPlanChange({ plan });
    redirect(`${returnTo ?? "/account"}?upgraded=1`);
  }

  return (
    <main className="mx-auto max-w-[560px] px-7 pb-20 pt-16">
      <div className="rounded-[20px] border-2 border-line bg-surface p-10">
        <p className="m-0 mb-2 font-semibold text-muted">Local billing mode</p>
        <h1 className="m-0 mb-4 text-[2em]">
          Switch to {PLAN_LABEL[plan]} ({PLAN_PRICE[plan]})?
        </h1>
        <p className="mb-8 text-[1.1em] text-muted">
          Stripe isn’t configured, so no payment is taken. Confirming applies the plan change
          server-side exactly as the Stripe webhook would. Set <code>STRIPE_SECRET_KEY</code> to use
          real Checkout — see <code>docs/INTEGRATIONS.md</code>.
        </p>

        <form action={confirm} className="flex flex-wrap gap-3">
          <Button type="submit" size="lg">
            Confirm change
          </Button>
        </form>
      </div>
    </main>
  );
}
