"use client";

import { useEffect, useRef, useState } from "react";

import { MOOD_LABEL } from "@/lib/domain";

/** Daily mood check-in — debounced POST /api/mood on change (spec §6.4). */
export function MoodSlider({ initial }: { initial: number | null }) {
  const [score, setScore] = useState(initial ?? 3);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  function change(next: number) {
    setScore(next);
    setSaved(false);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const response = await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: next }),
      });
      setSaved(response.ok);
    }, 600);
  }

  return (
    <>
      <label htmlFor="mood" className="sr-only">
        How is your body feeling today, from 1 (stiff) to 5 (ready)?
      </label>
      <input
        id="mood"
        type="range"
        min={1}
        max={5}
        step={1}
        value={score}
        onChange={(event) => change(Number(event.target.value))}
        aria-valuetext={MOOD_LABEL[score]}
      />
      <div className="mt-3 flex justify-between text-[0.98em] text-muted">
        <span>Stiff</span>
        <span>Okay</span>
        <span>Ready</span>
      </div>
      <p
        className="m-0 mt-auto pt-[18px] text-center text-[1.2em] font-semibold text-accent-dark"
        aria-live="polite"
      >
        {MOOD_LABEL[score]}
      </p>
      <p className="m-0 mt-1 text-center text-[0.9em] text-muted" aria-live="polite">
        {saved ? "Saved" : " "}
      </p>
    </>
  );
}
