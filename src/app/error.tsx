"use client";

import { useEffect } from "react";

import { Button, ButtonLink } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry (or any reporter) hooks in here — see docs/INTEGRATIONS.md.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-[620px] px-7 pb-20 pt-20 text-center">
      <h1 className="m-0 mb-4 text-[2.4em]">Something went wrong</h1>
      <p className="mb-8 text-[1.2em] text-muted">
        Nothing you did caused this, and nothing was lost. Try again, or head back to the library.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={reset}>
          Try again
        </Button>
        <ButtonLink href="/library" variant="outline" size="lg">
          Browse the library
        </ButtonLink>
      </div>
    </main>
  );
}
