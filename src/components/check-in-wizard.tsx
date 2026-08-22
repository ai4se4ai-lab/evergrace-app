"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createAccountFromCheckIn, submitHealthCheckIn } from "@/actions/onboarding";
import { CheckIcon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { healthQuestions } from "@/content/site";
import { TRACK_DESCRIPTION, TRACK_LABEL, type Track } from "@/lib/domain";
import { cn } from "@/lib/utils";

type Answers = Partial<Record<string, string>>;

/**
 * Health check-in wizard (spec §6.2): welcome → 4 questions → result. Local
 * wizard state only; the track itself is always computed on the server.
 */
export function CheckInWizard({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [track, setTrack] = useState<Track | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalSteps = healthQuestions.length + 1;
  const isWelcome = step === 0;
  const isResult = step > healthQuestions.length;
  const question = healthQuestions[step - 1];
  const selected = question ? answers[question.key] : undefined;

  const barPercent = isWelcome ? 4 : isResult ? 100 : (step / totalSteps) * 100;
  const progressLabel = isResult
    ? "All done!"
    : isWelcome
      ? "Welcome"
      : `Question ${step} of ${healthQuestions.length}`;

  function next() {
    setError(null);

    if (step < healthQuestions.length) {
      setStep(step + 1);
      return;
    }

    // Last question answered — score it server-side.
    startTransition(async () => {
      const result = await submitHealthCheckIn(answers);
      if (!result.ok || !result.track) {
        setError(result.message ?? "Please answer every question.");
        return;
      }
      setTrack(result.track);
      setStep(step + 1);
      if (signedIn) router.refresh();
    });
  }

  return (
    <>
      <div
        className="mb-3 h-3 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={Math.round(barPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Check-in progress"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${barPercent}%` }}
        />
      </div>
      <p className="mb-8 text-center font-semibold text-muted">{progressLabel}</p>

      {isWelcome ? (
        <section className="animate-fadeup rounded-[20px] border-2 border-line bg-surface px-10 py-[52px] text-center">
          <h1 className="m-0 mb-4 text-[2.4em]">Let’s find your safe starting point</h1>
          <p className="mx-auto mb-[34px] max-w-[44ch] text-[1.25em] text-muted">
            A few simple questions help us pick movements that are right for your body today.
            Nothing is shared, and you can change your answers anytime.
          </p>
          <Button size="hero" onClick={() => setStep(1)}>
            Start the check-in
          </Button>
        </section>
      ) : null}

      {question ? (
        <section className="animate-fadeup rounded-[20px] border-2 border-line bg-surface p-10">
          <fieldset className="border-0 p-0">
            <legend className="mb-7 text-[1.9em] font-bold leading-tight">{question.text}</legend>
            <div className="flex flex-col gap-3.5">
              {question.options.map((option) => {
                const active = selected === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-4 rounded-[14px] border-2 px-[22px] py-5 text-[1.15em] font-semibold",
                      active ? "border-accent bg-accent-soft" : "border-line",
                    )}
                  >
                    <input
                      type="radio"
                      name={question.key}
                      value={option.value}
                      checked={active}
                      onChange={() =>
                        setAnswers((current) => ({ ...current, [question.key]: option.value }))
                      }
                      className="sr-only"
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "h-[26px] w-[26px] flex-none rounded-full border-[3px]",
                        active
                          ? "border-accent bg-accent shadow-[inset_0_0_0_3px_#fff]"
                          : "border-[#c9bfae]",
                      )}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {error ? (
            <p className="mt-4 font-semibold text-warn" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-8 flex justify-between gap-4">
            <Button variant="outline" size="lg" onClick={() => setStep(step - 1)}>
              Back
            </Button>
            <Button size="lg" disabled={!selected || pending} onClick={next}>
              {pending ? "One moment…" : "Continue"}
            </Button>
          </div>
        </section>
      ) : null}

      {isResult && track ? (
        <ResultPanel track={track} signedIn={signedIn} />
      ) : null}
    </>
  );
}

function ResultPanel({ track, signedIn }: { track: Track; signedIn: boolean }) {
  const [state, setState] = useState<{
    message?: string;
    devUrl?: string;
    error?: string;
  }>({});
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createAccountFromCheckIn(null, formData);
      if (!result.ok) {
        setState({ error: result.message ?? result.fieldErrors?.email ?? "Please check your email address." });
        return;
      }
      setState({ message: result.message, devUrl: result.devUrl });
    });
  }

  return (
    <section className="animate-fadeup rounded-[20px] border-2 border-line bg-surface px-10 py-12 text-center">
      <div className="animate-pop mx-auto mb-[22px] flex h-[88px] w-[88px] items-center justify-center rounded-full bg-success-soft">
        <CheckIcon size={46} className="text-success" />
      </div>

      <p className="m-0 mb-1.5 text-[1.05em] font-semibold text-muted">Your recommended track</p>
      <h1 className="m-0 mb-3.5 text-[2.5em]">{TRACK_LABEL[track]}</h1>
      <p className="mx-auto mb-[22px] max-w-[46ch] text-[1.25em] text-muted">
        {TRACK_DESCRIPTION[track]}
      </p>

      {track === "SEATED" ? (
        <div className="mb-7 flex items-start gap-3 rounded-[14px] border-2 border-[var(--notice-line)] bg-[var(--notice-bg)] px-5 py-[18px] text-left">
          <span className="text-[1.4em]" aria-hidden>
            🔒
          </span>
          <p className="m-0 text-[1.08em] text-[var(--notice-fg)]">
            For your safety, high-intensity videos are locked. We’ve prepared a gentle seated
            curriculum you can build from. Talk to your doctor before increasing intensity.
          </p>
        </div>
      ) : null}

      <div className="mt-2 border-t-2 border-line pt-[30px] text-left">
        {signedIn ? (
          <>
            <h2 className="m-0 mb-2 text-center text-[1.6em]">Your track is saved</h2>
            <p className="mx-auto mb-[22px] max-w-[46ch] text-center text-[1.15em] text-muted">
              Your dashboard now suggests sessions matched to this track.
            </p>
            <ButtonLink href="/dashboard" size="hero" className="w-full">
              Open my dashboard →
            </ButtonLink>
          </>
        ) : state.message ? (
          <div className="text-center">
            <h2 className="m-0 mb-2 text-[1.6em]">Check your email</h2>
            <p className="mx-auto mb-5 max-w-[46ch] text-[1.15em] text-muted">{state.message}</p>
            {state.devUrl ? (
              <Link
                href={state.devUrl}
                className="inline-block break-all rounded-control border-2 border-line bg-bg px-4 py-3 font-semibold text-accent-dark"
              >
                Open my dashboard (local sign-in link)
              </Link>
            ) : null}
          </div>
        ) : (
          <form action={submit}>
            <h2 className="m-0 mb-2 text-center text-[1.6em]">
              Create your free account to save this
            </h2>
            <p className="mx-auto mb-[22px] max-w-[46ch] text-center text-[1.15em] text-muted">
              You’re all set! Sign up now and your personalized dashboard opens right away — with
              your track, today’s session, and your streak. We’ll email you a magic link, so there’s
              no password to remember.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name (optional)" htmlFor="name">
                <Input id="name" name="name" autoComplete="name" placeholder="Margaret" />
              </Field>
              <Field label="Your age (optional)" htmlFor="age">
                <Input id="age" name="age" type="number" min={18} max={120} placeholder="72" />
              </Field>
            </div>

            <Field
              label="Your email address"
              htmlFor="email"
              className="mt-4"
              error={state.error}
            >
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
              {pending ? "Creating your account…" : "Sign up & open my dashboard →"}
            </Button>
            <p className="mt-3.5 text-center text-[0.98em] text-muted">
              Free forever. Your health answers stay private.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
