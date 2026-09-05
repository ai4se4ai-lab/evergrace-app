"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 6000;

export type TeamCarouselMember = {
  id: string;
  name: string;
  role: string;
  bio: string;
  initials: string;
};

/**
 * Stakeholders & leadership slideshow — same autoplay/hover-pause/dot pattern
 * as the landing FeatureCarousel, but for a single full-bleed member per slide.
 */
export function TeamCarousel({ members }: { members: TeamCarouselMember[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const go = useCallback(
    (next: number) => setIndex(((next % members.length) + members.length) % members.length),
    [members.length],
  );

  useEffect(() => {
    if (paused || reducedMotion || members.length < 2) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % members.length), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, reducedMotion, members.length]);

  if (members.length === 0) return null;

  const active = members[index];

  return (
    <div>
      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        className="relative overflow-hidden rounded-[20px] border-2 border-line shadow-[0_12px_40px_rgba(0,0,0,.08)]"
      >
        <div className="placeholder-art relative flex h-[420px] items-center justify-center" aria-live="polite" aria-atomic="true">
          <span
            className="flex h-24 w-24 items-center justify-center rounded-full bg-accent text-[1.8em] font-extrabold text-white"
            aria-hidden
          >
            {active.initials || active.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(20,17,14,.85)_0%,rgba(20,17,14,.4)_42%,rgba(20,17,14,0)_70%)]" />
          <div className="absolute inset-x-0 bottom-0 px-8 py-7">
            <h4 className="m-0 mb-1.5 text-[1.6em] text-white [text-shadow:0_2px_8px_rgba(0,0,0,.5)]">
              {active.name}
            </h4>
            <div className="mb-2.5 text-[1.08em] font-bold text-[#ffd9a3]">{active.role}</div>
            <p className="m-0 max-w-[60ch] text-[1.08em] leading-[1.5] text-white/92">{active.bio}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label="Previous team member"
          className="absolute left-4 top-[calc(50%-26px)] flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-line bg-surface/95 text-fg shadow-[0_4px_14px_rgba(0,0,0,.12)]"
        >
          <ChevronLeftIcon />
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Next team member"
          className="absolute right-4 top-[calc(50%-26px)] flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-line bg-surface/95 text-fg shadow-[0_4px_14px_rgba(0,0,0,.12)]"
        >
          <ChevronRightIcon size={24} />
        </button>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {members.map((member, i) => (
          <button
            key={member.id}
            type="button"
            onClick={() => go(i)}
            aria-label={`Show ${member.name}`}
            aria-current={i === index}
            className={cn(
              "h-3 rounded-full border-none transition-[width,background]",
              i === index ? "w-[38px] bg-accent" : "w-3 bg-line",
            )}
          />
        ))}
      </div>
    </div>
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
