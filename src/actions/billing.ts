"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireViewer } from "@/lib/auth";
import { applyPlanChange, billing } from "@/lib/billing";
import { planRank } from "@/lib/domain";
import { planChangeSchema } from "@/lib/validation";

/**
 * Entry point for the plan modal (spec §6.6). A paid plan starts a Checkout
 * session; choosing Basic from a paid plan is a downgrade and goes to the
 * billing portal. Either way the member's plan is not changed here.
 */
export async function startPlanChange(input: unknown): Promise<never> {
  const viewer = await requireViewer();
  const { plan, returnTo } = planChangeSchema.parse(input);

  const isDowngrade = planRank(plan) < planRank(viewer.plan);

  const url = isDowngrade
    ? await billing.billingPortalUrl(viewer.id)
    : (await billing.startCheckout({ userId: viewer.id, email: viewer.email, plan, returnTo })).url;

  redirect(url);
}

/**
 * Mock-billing confirmation. Only reachable when Stripe is not configured; with
 * Stripe configured the plan changes exclusively through the webhook.
 */
export async function confirmMockPlanChange(input: unknown): Promise<void> {
  const viewer = await requireViewer();
  const { plan } = planChangeSchema.parse(input);

  if (billing.name !== "mock") {
    throw new Error("Plan changes go through Stripe when it is configured.");
  }

  await applyPlanChange(viewer.id, plan);
  revalidatePath("/dashboard");
  revalidatePath("/account");
  revalidatePath("/library");
}
