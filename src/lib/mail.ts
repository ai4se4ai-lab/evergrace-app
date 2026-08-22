import nodemailer from "nodemailer";

import { emailConfigured, env } from "./env";

export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

let transporter: ReturnType<typeof nodemailer.createTransport> | undefined;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.email.smtpHost,
      port: env.email.smtpPort,
      secure: env.email.smtpSecure,
      auth: env.email.smtpUser
        ? { user: env.email.smtpUser, pass: env.email.smtpPass }
        : undefined,
    });
  }
  return transporter;
}

/**
 * Sends transactional mail through SMTP when SMTP_HOST is present. Otherwise
 * the message is logged — which is what makes the local magic-link flow
 * usable without an SMTP account.
 */
export async function sendEmail(message: OutboundEmail): Promise<{ delivered: boolean }> {
  if (!emailConfigured) {
    console.info(
      [
        "",
        "──────────── EverGrace · local mail ────────────",
        `To:      ${message.to}`,
        `Subject: ${message.subject}`,
        "",
        message.text,
        "────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { delivered: false };
  }

  await getTransporter().sendMail({
    from: env.email.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  return { delivered: true };
}

export function magicLinkEmail(to: string, url: string): OutboundEmail {
  return {
    to,
    subject: "Your EverGrace sign-in link",
    text: [
      "Welcome back to EverGrace.",
      "",
      "Open this link to sign in. It works once and expires in 20 minutes:",
      url,
      "",
      "If you didn’t ask for this, you can safely ignore this email.",
    ].join("\n"),
    html: `<p>Welcome back to EverGrace.</p>
<p><a href="${url}" style="font-size:18px;font-weight:700">Sign in to EverGrace</a></p>
<p style="color:#6b635a">This link works once and expires in 20 minutes. If you didn’t ask for it, you can ignore this email.</p>`,
  };
}
