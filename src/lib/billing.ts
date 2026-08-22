import "server-only";

import { prisma } from "./db";
import { env, stripeConfigured } from "./env";
import type { Plan } from "./domain";

/**
 * Billing boundary — spec §6.6.
 *
 * The invariant the spec cares about is that `User.plan` is only ever written
 * by the billing layer in response to a confirmed payment event, never
 * optimistically by the client. Both providers below honour that:
 *
 *  - StripeProvider: `startCheckout` returns a hosted Checkout URL; the plan
 *    changes only when /api/stripe/webhook fires.
 *  - MockProvider (MVP default, no STRIPE_SECRET_KEY): `startCheckout` returns
 *    a URL to /account/confirm, which calls `applyPlanChange` server-side —
 *    the same single function the real webhook calls.
 */

export type CheckoutRequest = {
  userId: string;
  email: string;
  plan: Plan;
  /** Video the member tried to watch, so we can return them to it. */
  returnTo?: string;
};

export type CheckoutResult = { url: string };

export interface BillingProvider {
  readonly name: "stripe" | "mock";
  startCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
  /** Where a member manages or cancels an existing paid subscription. */
  billingPortalUrl(userId: string): Promise<string>;
}

/**
 * The one place `User.plan` changes. Called by the Stripe webhook handler and
 * by the mock provider's confirm route.
 */
export async function applyPlanChange(
  userId: string,
  plan: Plan,
  stripeIds?: { customerId?: string; subscriptionId?: string },
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      ...(stripeIds?.customerId ? { stripeCustomerId: stripeIds.customerId } : {}),
      ...(stripeIds?.subscriptionId ? { stripeSubscriptionId: stripeIds.subscriptionId } : {}),
    },
  });
}

const mockProvider: BillingProvider = {
  name: "mock",
  async startCheckout({ plan, returnTo }) {
    const params = new URLSearchParams({ plan });
    if (returnTo) params.set("returnTo", returnTo);
    return { url: `/account/confirm?${params.toString()}` };
  },
  async billingPortalUrl() {
    return "/account/confirm?plan=BASIC";
  },
};

const stripeProvider: BillingProvider = {
  name: "stripe",
  async startCheckout({ userId, email, plan, returnTo }) {
    const priceId = plan === "PREMIUM" ? env.stripe.pricePremium : env.stripe.priceMember;
    if (!priceId) throw new Error(`No Stripe price configured for plan ${plan}.`);

    const successPath = returnTo ?? "/dashboard";
    const body = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      customer_email: email,
      client_reference_id: userId,
      "metadata[userId]": userId,
      "metadata[plan]": plan,
      success_url: `${env.appUrl}${successPath}?upgraded=1`,
      cancel_url: `${env.appUrl}/account?cancelled=1`,
    });

    const session = await stripeRequest<{ url: string }>("checkout/sessions", body);
    return { url: session.url };
  },

  async billingPortalUrl(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) return "/account";

    const body = new URLSearchParams({
      customer: user.stripeCustomerId,
      return_url: `${env.appUrl}/account`,
    });
    const portal = await stripeRequest<{ url: string }>("billing_portal/sessions", body);
    return portal.url;
  },
};

async function stripeRequest<T>(path: string, body: URLSearchParams): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.stripe.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`Stripe ${path} failed (${response.status}): ${await response.text()}`);
  }
  return (await response.json()) as T;
}

export const billing: BillingProvider = stripeConfigured ? stripeProvider : mockProvider;
