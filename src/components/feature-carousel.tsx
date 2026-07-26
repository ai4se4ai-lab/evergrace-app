"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChevronLeftIcon, ChevronRightIcon, PlayIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui/button";
import type { Feature } from "@/content/site";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 5000;

/**
 * Landing hero carousel (spec §6.1): 5s autoplay, pauses on hover and focus,
 * dot + prev/next navigation. Autoplay is disabled entirely for visitors who
 * prefer reduced motion.
 */
export function FeatureCarousel({ features }: { features: Feature[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const go = useCallback(
    (next: number) => setIndex(((next % features.length) + features.length) % features.length),
    [features.length],
  );

  useEffect(() => {
    if (paused || reducedMotion) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % features.length), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, reducedMotion, features.length]);

  const active = features[index];

  return (
    <section aria-label="What EverGrace offers" className="shell pb-20 pt-3">
      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        className="relative overflow-hidden rounded-[24px] border-2 border-line bg-surface shadow-[0_12px_40px_rgba(0,0,0,.08)]"
      >
        <div
          className="grid md:grid-cols-2 md:min-h-[420px]"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="placeholder-art relative flex min-h-[220px] items-center justify-center">
            <Link
              href="/library"
              aria-label={`Watch a sample of ${active.title}`}
              className="flex h-[82px] w-[82px] items-center justify-center rounded-full bg-[rgba(251,248,242,.94)] text-accent shadow-[0_6px_20px_rgba(0,0,0,.2)]"
            >
              <PlayIcon size={34} />
            </Link>
          </div>

          <div className="flex flex-col justify-center px-8 py-12 md:px-[46px]">
            <span className="mb-[18px] inline-flex items-center gap-2.5">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-[13px] bg-accent-soft text-[1.4em] font-bold text-accent-dark"
                aria-hidden
              >
                {active.icon}
              </span>
              <span className="text-[0.9em] font-semibold uppercase tracking-[0.04em] text-muted">
                {active.kicker}
              </span>
            </span>
            <h3 className="m-0 mb-3.5 text-[2.1em] leading-tight">{active.title}</h3>
            <p className="m-0 mb-[22px] max-w-[34ch] text-[1.25em] text-muted">
              {active.description}
            </p>
            <Link href={active.href} className={cn(buttonClass("primary", "lg"), "self-start")}>
              {active.ctaLabel} <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label="Previous slide"
          className="absolute left-4 top-1/2 flex h-[52px] w-[52px] -translate-y-1/2 items-center justify-center rounded-full border-2 border-line bg-surface text-fg shadow-[0_4px_14px_rgba(0,0,0,.12)]"
        >
          <ChevronLeftIcon />
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Next slide"
          className="absolute right-4 top-1/2 flex h-[52px] w-[52px] -translate-y-1/2 items-center justify-center rounded-full border-2 border-line bg-surface text-fg shadow-[0_4px_14px_rgba(0,0,0,.12)]"
        >
          <ChevronRightIcon size={24} />
        </button>
      </div>

      <div className="mt-6 flex justify-center gap-3">
        {features.map((feature, i) => (
          <button
            key={feature.title}
            type="button"
            onClick={() => go(i)}
            aria-label={`Show ${feature.title}`}
            aria-current={i === index}
            className={cn(
              "h-[18px] w-[18px] rounded-full border-2",
              i === index ? "border-accent bg-accent" : "border-line bg-transparent",
            )}
          />
        ))}
      </div>
    </section>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  const media = useRef<MediaQueryList | null>(null);

  useEffect(() => {
    media.current = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(Boolean(media.current?.matches));
    apply();
    media.current.addEventListener("change", apply);
    return () => media.current?.removeEventListener("change", apply);
  }, []);

  return reduced;
}
