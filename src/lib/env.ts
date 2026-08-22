/**
 * Environment access with explicit fallbacks.
 *
 * Every optional integration (email, billing, video, observability) reports
 * whether it is configured so the UI can show an honest "running in local
 * mode" affordance instead of silently pretending to send an email or charge a
 * card. See docs/INTEGRATIONS.md.
 */

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

export const env = {
  appUrl: optional("APP_URL") ?? "http://localhost:3000",
  authSecret: optional("AUTH_SECRET") ?? "evergrace-insecure-dev-secret",
  cronSecret: optional("CRON_SECRET"),

  email: {
    smtpHost: optional("SMTP_HOST"),
    smtpPort: Number(optional("SMTP_PORT") ?? "587"),
    smtpSecure: optional("SMTP_SECURE") === "true",
    smtpUser: optional("SMTP_USER"),
    smtpPass: optional("SMTP_PASS"),
    from: optional("SMTP_FROM") ?? "hello@evergrace.example",
  },
  stripe: {
    secretKey: optional("STRIPE_SECRET_KEY"),
    webhookSecret: optional("STRIPE_WEBHOOK_SECRET"),
    priceMember: optional("STRIPE_PRICE_MEMBER"),
    pricePremium: optional("STRIPE_PRICE_PREMIUM"),
  },
  mux: {
    tokenId: optional("MUX_TOKEN_ID"),
    tokenSecret: optional("MUX_TOKEN_SECRET"),
    webhookSecret: optional("MUX_WEBHOOK_SECRET"),
  },
  sentryDsn: optional("SENTRY_DSN"),
} as const;

export const isProduction = process.env.NODE_ENV === "production";

export const emailConfigured = Boolean(env.email.smtpHost);
export const stripeConfigured = Boolean(env.stripe.secretKey && env.stripe.priceMember);
export const muxConfigured = Boolean(env.mux.tokenId && env.mux.tokenSecret);

export function validateBootEnv(input: {
  nodeEnv: string | undefined;
  databaseUrl: string | undefined;
  authSecret: string;
  cronSecret: string | undefined;
}): void {
  if (input.nodeEnv !== "production") return;

  const problems: string[] = [];
  if (!input.databaseUrl || input.databaseUrl.trim().length === 0) {
    problems.push("DATABASE_URL must be set in production.");
  }
  if (input.authSecret === "evergrace-insecure-dev-secret") {
    problems.push("AUTH_SECRET must be set in production.");
  }
  if (!input.cronSecret) {
    problems.push("CRON_SECRET must be set in production.");
  }

  if (problems.length > 0) {
    throw new Error(`Invalid production environment:\n- ${problems.join("\n- ")}`);
  }
}

// Note: this is invoked from src/instrumentation.ts's register() hook, which
// runs once at real server boot (next start / standalone server.js) — not at
// module import time, so it does not run during `next build`'s page-data
// collection phase.
