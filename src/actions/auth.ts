"use server";

import { redirect } from "next/navigation";

import {
  createSession,
  destroySession,
  issueMagicLink,
  verifyAdminCredentials,
} from "@/lib/auth";
import { adminLoginSchema, emailSchema } from "@/lib/validation";

export type FormState = {
  ok: boolean;
  message?: string;
  /** Local-mode magic link, so sign-in works without a mailbox. */
  devUrl?: string;
  fieldErrors?: Record<string, string>;
};

export async function requestMagicLink(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { ok: false, fieldErrors: { email: parsed.error.issues[0].message } };
  }

  const result = await issueMagicLink(parsed.data);
  return {
    ok: true,
    message: result.delivered
      ? `We’ve sent a sign-in link to ${parsed.data}. It expires in 20 minutes.`
      : `Local mode: no email was sent. Use the link below to sign in as ${parsed.data}.`,
    devUrl: result.devUrl,
  };
}

export async function adminSignIn(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const parsed = adminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const result = await verifyAdminCredentials(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    // One message for both wrong-email and wrong-password.
    return { ok: false, message: "Those credentials don’t match a staff account." };
  }

  await createSession(result.userId);
  redirect("/admin/reports");
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/");
}
