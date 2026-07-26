# Integrations

The spec names Resend, Stripe, Mux, and Sentry. Each sits behind a small adapter
with a working local fallback, so the app runs end-to-end with **no** credentials
and switches to the real service when its environment variables appear. Nothing
pretends to have happened: local mode says so in the UI.

`src/lib/env.ts` exposes `emailConfigured`, `stripeConfigured`, and
`muxConfigured`; those flags select the adapter.

## Email — `src/lib/mail.ts`

| Configured with | Behaviour |
|---|---|
| `RESEND_API_KEY` | `POST https://api.resend.com/emails` |
| *unset (default)* | The message is written to the server log, and `issueMagicLink` returns `devUrl` so the sign-in page can render the link as a button |

`sendEmail` returns `{ delivered }`, and the UI copy differs accordingly: *"We've
sent a sign-in link to …"* versus *"Local mode: no email was sent."*
`devUrl` is `undefined` in production regardless of configuration.

**To go live:** set `RESEND_API_KEY` and `EMAIL_FROM` on a verified domain. To
use Postmark or SMTP instead, replace the one `fetch` in `sendEmail`.

## Billing — `src/lib/billing.ts`

`BillingProvider` has two methods: `startCheckout` and `billingPortalUrl`.

| Configured with | Provider | `startCheckout` |
|---|---|---|
| `STRIPE_SECRET_KEY` + `STRIPE_PRICE_MEMBER` | `stripe` | Creates a hosted Checkout session (`mode: subscription`) and returns its URL |
| *unset (default)* | `mock` | Returns `/account/confirm?plan=…`, a page that states plainly that no payment is taken |

The invariant the spec cares about holds in both modes: **`User.plan` is only
written by `applyPlanChange`**, called from the Stripe webhook or, in mock mode,
from the confirm route's Server Action. `confirmMockPlanChange` throws if Stripe
is configured, so the two paths can never both be live.

Downgrades (choosing a lower-ranked plan) go to the billing portal rather than
Checkout.

The Stripe REST calls are plain `fetch`, and webhook signatures are verified
directly against Stripe's `t=…,v1=…` scheme with HMAC-SHA256 +
`timingSafeEqual`, including a five-minute freshness window. That avoids a hard
dependency on the SDK; swap in `stripe` if you prefer.

**To go live:**

```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MEMBER=price_...      # $9/mo recurring
STRIPE_PRICE_PREMIUM=price_...     # $19/mo recurring
```

Point a webhook endpoint at `/api/stripe/webhook` subscribed to
`checkout.session.completed`, `customer.subscription.updated`, and
`customer.subscription.deleted`. Locally: `stripe listen --forward-to
localhost:3000/api/stripe/webhook`.

## Video — `src/lib/media.ts`

| Configured with | Upload | Publish |
|---|---|---|
| `MUX_TOKEN_ID` + `MUX_TOKEN_SECRET` | `createDirectUpload` returns a Mux direct-upload URL; the browser PUTs the file straight to Mux | `POST /api/mux/webhook` on `video.asset.ready` stores `muxPlaybackId` + thumbnail, sets `PUBLISHED`, fans out notifications |
| *unset (default)* | The upload form takes a direct video URL instead of a file | `POST /api/media/webhook` does exactly the same thing |

Both paths create the `Video` row as `PROCESSING` and rely on a webhook to
publish, so the publish → notification behaviour is identical whether or not Mux
is present. That is what makes the fan-out testable locally.

**Playback.** `PlayerStage` drives a native `<video>` when the video has a
`sourceUrl`. Seeded content has no media file, so the same controls drive a
simulated clock instead — which keeps the transcript highlighting, seek bar,
caption overlay, and progress heartbeat genuinely functional rather than
decorative. To use Mux Player, install `@mux/mux-player-react` and swap the
`<video>` element in `PlayerStage`; the surrounding progress and transcript logic
does not change.

**Locked videos never receive a playback URL.** `getVideoDetail` strips both
`sourceUrl` and `muxPlaybackId` server-side, so a signed URL can't leak through
the client bundle. With Mux in production, also use signed playback policies —
`createDirectUpload` already requests `playback_policy: ["signed"]`.

**To go live:** set the Mux variables, then add a webhook to
`/api/mux/webhook` for `video.asset.ready` and set `MUX_WEBHOOK_SECRET`.

## Observability — Sentry

`SENTRY_DSN` is read but not wired; `src/app/error.tsx` currently logs to the
console and is the intended hook point. To finish:

```bash
npx @sentry/wizard@latest -i nextjs
```

then report from the `useEffect` in `error.tsx` and from the `catch` blocks in
the webhook handlers.

## Background jobs — Inngest / Vercel Cron

The spec suggests Inngest for the notification fan-out and a nightly status
recompute.

- **Fan-out** runs inline in `fanOutNewVideo`. It is the single seam to move
  behind a queue: publish the video id as an event instead of awaiting the call.
- **Nightly job** is `POST /api/cron/recompute-status`, guarded by
  `x-cron-secret`. Because member status is derived, it writes nothing to `User`
  — it reports the distribution and prunes expired sessions and magic-link
  tokens. Wire it up in `vercel.json`; see [DEPLOYMENT.md](./DEPLOYMENT.md).

## File storage — Vercel Blob / S3

Not implemented. Team photos and blog thumbnails currently use the prototype's
hatched placeholder, and `TeamMember.photoUrl` / `BlogPost.thumbnailUrl` columns
already exist to hold real URLs. Adding an upload means a signed-URL route plus
writing the returned URL into those columns.

## Summary

| Integration | Default | Real service | Fully wired |
|---|---|---|---|
| Email | Console + on-page link | Resend | Yes |
| Billing | Local confirm page | Stripe Checkout + webhook | Yes |
| Video | Source URL + local webhook | Mux upload + webhook | Upload/publish yes; Mux Player swap pending |
| Cron | Manual `curl` | Vercel Cron | Yes |
| Errors | `console.error` | Sentry | Hook point only |
| Blob storage | Placeholder art | Vercel Blob / S3 | No |
