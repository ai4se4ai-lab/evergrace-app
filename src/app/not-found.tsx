import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[620px] px-7 pb-20 pt-20 text-center">
      <h1 className="m-0 mb-4 text-[2.4em]">We couldn’t find that page</h1>
      <p className="mb-8 text-[1.2em] text-muted">
        The link may be old, or the video may have been moved. Everything is still where you left it
        in the library.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href="/" size="lg">
          Back to home
        </ButtonLink>
        <ButtonLink href="/library" variant="outline" size="lg">
          Browse the library
        </ButtonLink>
      </div>
    </main>
  );
}
