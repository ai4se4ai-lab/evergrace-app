import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { applyPlanChange } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { env, stripeConfigured } from "@/lib/env";
import type { Plan } from "@/lib/domain";

/**
 * Stripe billing webhook (spec §6.6) — the ONLY place a paid plan is granted or
 * revoked. Handles `checkout.session.completed`,
 * `customer.subscription.updated`, and `customer.subscription.deleted`.
 *
 * Signature verification is implemented directly against Stripe's scheme
 * (`t=<ts>,v1=<hmac>`) so the MVP has no hard dependency on the stripe SDK.
 */
export async function POST(request: NextRequest) {
  if (!stripeConfigured || !env.stripe.webhookSecret) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const raw = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !verifyStripeSignature(raw, signature, env.stripe.webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(raw) as StripeEvent;

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as CheckoutSession;
      const userId = session.metadata?.userId ?? session.client_reference_id;
      const plan = session.metadata?.plan as Plan | undefined;
      if (userId && plan) {
        await applyPlanChange(userId, plan, {
          customerId: session.customer ?? undefined,
          subscriptionId: session.subscription ?? undefined,
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Subscription;
      const plan = planForPrice(subscription.items?.data?.[0]?.price?.id);
      const userId = await userIdForCustomer(subscription.customer);
      if (userId && plan) {
        // A cancelled-but-not-yet-expired subscription keeps its access until
        // Stripe sends the delete event.
        await applyPlanChange(userId, subscription.status === "active" ? plan : "BASIC");
      }
      break;
    }

    case "customer.subscription.deleted": {
      const userId = await userIdForCustomer((event.data.object as Subscription).customer);
      if (userId) await applyPlanChange(userId, "BASIC");
      break;
    }

    default:
      // Unhandled event types are acknowledged so Stripe stops retrying.
      break;
  }

  return NextResponse.json({ received: true });
}

function verifyStripeSignature(payload: string, header: string, secret: string): boolean {
  const parts = new Map(
    header.split(",").map((piece) => {
      const [key, value] = piece.split("=");
      return [key?.trim(), value?.trim()] as const;
    }),
  );

  const timestamp = parts.get("t");
  const provided = parts.get("v1");
  if (!timestamp || !provided) return false;

  // Reject anything older than five minutes to blunt replay attempts.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

function planForPrice(priceId: string | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === env.stripe.pricePremium) return "PREMIUM";
  if (priceId === env.stripe.priceMember) return "MEMBER";
  return null;
}

async function userIdForCustomer(customerId: string | null | undefined): Promise<string | null> {
  if (!customerId) return null;
  const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
  return user?.id ?? null;
}

type StripeEvent = { type: string; data: { object: unknown } };

type CheckoutSession = {
  metadata?: { userId?: string; plan?: string };
  client_reference_id?: string | null;
  customer?: string | null;
  subscription?: string | null;
};

type Subscription = {
  customer: string | null;
  status?: string;
  items?: { data?: { price?: { id?: string } }[] };
};
