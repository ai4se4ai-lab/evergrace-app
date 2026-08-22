"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestMagicLink, type FormState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function MagicLinkForm() {
  const [state, formAction, pending] = useActionState<FormState | null, FormData>(
    requestMagicLink,
    null,
  );

  if (state?.ok) {
    return (
      <div className="text-left">
        <p className="m-0 mb-4 rounded-control border-2 border-line bg-bg px-4 py-3.5 text-[1.05em]">
          {state.message}
        </p>
        {state.devUrl ? (
          <Link
            href={state.devUrl}
            className="inline-block w-full break-all rounded-control border-2 border-accent bg-accent-soft px-4 py-3.5 text-center font-bold text-accent-dark"
          >
            Sign in now (local link)
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="text-left">
      <Field label="Your email address" htmlFor="email" error={state?.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="text-[1.15em]"
        />
      </Field>
      <Button type="submit" size="hero" className="mt-4 w-full" disabled={pending}>
        {pending ? "Sending…" : "Send my magic link →"}
      </Button>
    </form>
  );
}
