import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { billing } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { emailConfigured, env, isProduction, muxConfigured, stripeConfigured } from "@/lib/env";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

/**
 * Read-only diagnostics. Nothing here is editable: every one of these values is
 * an environment variable, and letting staff change deployment configuration
 * from a web form would be a foot-gun. The page exists so that "why aren't
 * members getting emails?" has an answer someone can read.
 */
export default async function AdminSettingsPage() {
  const viewer = await requireAdmin();

  const [videos, published, members, admins, notifications, follows, sessions, tokens] =
    await Promise.all([
      prisma.video.count(),
      prisma.video.count({ where: { status: "PUBLISHED" } }),
      prisma.user.count({ where: { role: "MEMBER" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.notification.count(),
      prisma.follow.count(),
      prisma.session.count(),
      prisma.magicLinkToken.count({ where: { usedAt: null } }),
    ]);

  const integrations = [
    {
      name: "Email delivery",
      live: emailConfigured,
      liveLabel: "Resend",
      fallback: "Magic links are written to the server log and shown on the sign-in page.",
      consequence: "Members cannot receive sign-in links by email until this is set.",
      variables: ["RESEND_API_KEY", "EMAIL_FROM"],
    },
    {
      name: "Billing",
      live: stripeConfigured,
      liveLabel: "Stripe Checkout",
      fallback: "Plan changes are applied by a local confirm page with no payment taken.",
      consequence: "No money is collected; upgrades are free.",
      variables: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_MEMBER", "STRIPE_PRICE_PREMIUM"],
    },
    {
      name: "Video hosting",
      live: muxConfigured,
      liveLabel: "Mux",
      fallback: "Uploads take a direct source URL; /api/media/webhook stands in for asset-ready.",
      consequence: "No file uploads or transcoding; videos need a hosted URL.",
      variables: ["MUX_TOKEN_ID", "MUX_TOKEN_SECRET", "MUX_WEBHOOK_SECRET"],
    },
    {
      name: "Error reporting",
      live: Boolean(env.sentryDsn),
      liveLabel: "Sentry",
      fallback: "Errors are logged to the server console only.",
      consequence: "Nobody is alerted when a member hits an error.",
      variables: ["SENTRY_DSN"],
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <h2 className="m-0 mb-1 text-[1.4em]">Integrations</h2>
        <p className="m-0 mb-5 max-w-prose text-muted">
          Each integration falls back to a documented local mode when its
          credentials are absent, so nothing silently pretends to work. Set these
          as environment variables and redeploy — see{" "}
          <code>docs/INTEGRATIONS.md</code>.
        </p>

        <ul role="list" className="m-0 flex list-none flex-col gap-3 p-0">
          {integrations.map((row) => (
            <li
              key={row.name}
              className="flex flex-wrap items-start gap-4 rounded-card border-2 border-line bg-bg px-5 py-4"
            >
              <span
                className={cn(
                  "min-w-[110px] flex-none rounded-full px-3 py-1 text-center text-[0.85em] font-bold",
                  row.live ? "bg-success-soft text-success" : "bg-warn-soft text-warn",
                )}
              >
                {row.live ? "Live" : "Local mode"}
              </span>

              <div className="min-w-[240px] flex-1">
                <div className="text-[1.15em] font-bold">
                  {row.name}
                  {row.live ? ` — ${row.liveLabel}` : ""}
                </div>
                <p className="m-0 mt-1 text-muted">{row.live ? "Configured." : row.fallback}</p>
                {!row.live ? (
                  <p className="m-0 mt-1 font-semibold text-[0.95em] text-warn">
                    {row.consequence}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1 text-[0.88em] text-muted">
                {row.variables.map((variable) => (
                  <code key={variable}>{variable}</code>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="m-0 mb-1 text-[1.4em]">Environment</h2>
        <p className="m-0 mb-5 text-muted">How this instance is running.</p>

        <dl className="m-0 grid gap-3">
          <Row term="Mode" value={isProduction ? "Production" : "Development"} />
          <Row term="Base URL" value={env.appUrl} />
          <Row term="Billing provider" value={billing.name === "stripe" ? "Stripe" : "Mock"} />
          <Row
            term="Auth secret"
            value={
              env.authSecret === "evergrace-insecure-dev-secret"
                ? "⚠ Using the insecure development default"
                : "Set"
            }
          />
          <Row term="Cron secret" value={env.cronSecret ? "Set" : "⚠ Not set — cron route is disabled"} />
          <Row term="Signed in as" value={viewer.email} />
        </dl>

        <p className="m-0 mt-5 text-[0.92em] text-muted">
          Secrets are never displayed — only whether they are present.
        </p>
      </Card>

      <Card>
        <h2 className="m-0 mb-1 text-[1.4em]">Content at a glance</h2>
        <p className="m-0 mb-5 text-muted">Totals across the whole instance.</p>

        <dl className="m-0 grid gap-3">
          <Row term="Videos" value={`${published} published of ${videos}`} />
          <Row term="Members" value={String(members)} />
          <Row term="Staff accounts" value={String(admins)} />
          <Row term="Follows" value={String(follows)} />
          <Row term="Notifications sent" value={String(notifications)} />
          <Row term="Active sessions" value={String(sessions)} />
          <Row term="Unused sign-in links" value={String(tokens)} />
        </dl>

        <p className="m-0 mt-5 text-[0.92em] text-muted">
          Expired sessions and links are pruned by{" "}
          <code>POST /api/cron/recompute-status</code>.
        </p>
      </Card>

      <Card className="lg:col-span-2">
        <h2 className="m-0 mb-1 text-[1.4em]">Documentation</h2>
        <p className="m-0 mb-5 text-muted">
          Everything about how this platform works is in the repository’s{" "}
          <code>docs/</code> directory.
        </p>

        <ul role="list" className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
          {[
            ["GETTING_STARTED.md", "Install, seed, demo logins"],
            ["ARCHITECTURE.md", "Layers, routes, authorization"],
            ["BUSINESS_RULES.md", "Access gating, tracks, member status"],
            ["DATA_MODEL.md", "Tables and derived values"],
            ["INTEGRATIONS.md", "Email, Stripe, Mux, Sentry"],
            ["ACCESSIBILITY.md", "What's implemented and how to test it"],
            ["DEPLOYMENT.md", "Postgres migration, Vercel, cron"],
            ["SPEC_COMPLIANCE.md", "Status against the spec, with deviations"],
          ].map(([file, description]) => (
            <li key={file} className="flex flex-wrap gap-2">
              <code className="font-bold">{file}</code>
              <span className="text-muted">— {description}</span>
            </li>
          ))}
        </ul>

        <p className="m-0 mt-5">
          <Link href="/admin/reports" className="font-bold text-accent-dark underline">
            Back to reports
          </Link>
        </p>
      </Card>
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-3 border-b border-line pb-2">
      <dt className="text-muted">{term}</dt>
      <dd className="m-0 break-all font-semibold">{value}</dd>
    </div>
  );
}
