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
    from: optional("EMAIL_FROM") ?? "hello@evergrace.example",
    resendApiKey: optional("RESEND_API_KEY"),
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

export const emailConfigured = Boolean(env.email.resendApiKey);
export const stripeConfigured = Boolean(env.stripe.secretKey && env.stripe.priceMember);
export const muxConfigured = Boolean(env.mux.tokenId && env.mux.tokenSecret);

if (isProduction && env.authSecret === "evergrace-insecure-dev-secret") {
  // Fail loudly rather than signing production session cookies with a
  // well-known key.
  throw new Error("AUTH_SECRET must be set in production.");
}
