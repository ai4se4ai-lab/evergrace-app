import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MagicLinkForm } from "@/components/magic-link-form";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in" };

const ERRORS: Record<string, string> = {
  expired: "That sign-in link has expired or was already used. Here’s a fresh one.",
  "missing-token": "That link was incomplete. Please request a new one.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const viewer = await getViewer();
  if (viewer) redirect(viewer.role === "ADMIN" ? "/admin/reports" : "/dashboard");

  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-[520px] px-7 pb-[90px] pt-16">
      <div className="rounded-[20px] border-2 border-line bg-surface px-10 py-11 text-center">
        <div
          className="mx-auto mb-[22px] flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-accent text-[1.6em] font-bold text-white"
          aria-hidden
        >
          道
        </div>
        <h1 className="m-0 mb-3 text-[2.2em]">Welcome back</h1>
        <p className="mx-auto mb-[30px] max-w-[40ch] text-[1.2em] text-muted">
          Enter your email and we’ll send you a magic link to sign in — no password needed.
        </p>

        {error && ERRORS[error] ? (
          <p
            className="mb-5 rounded-control border-2 border-[var(--notice-line)] bg-[var(--notice-bg)] px-4 py-3 text-left text-[var(--notice-fg)]"
            role="alert"
          >
            {ERRORS[error]}
          </p>
        ) : null}

        <MagicLinkForm />

        <p className="mt-6 text-[1.05em] text-muted">
          New here?{" "}
          <Link
            href="/onboarding"
            className="font-bold text-accent-dark underline underline-offset-[3px]"
          >
            Create a free account
          </Link>
        </p>
        <p className="mt-4 border-t border-line pt-4 text-[0.98em] text-muted">
          Staff member?{" "}
          <Link
            href="/admin/login"
            className="font-bold text-accent-dark underline underline-offset-[3px]"
          >
            Admin sign-in
          </Link>
        </p>
      </div>
    </main>
  );
}
