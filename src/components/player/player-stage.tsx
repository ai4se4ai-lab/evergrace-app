"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { PauseIcon, PlayIcon, RewindIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { formatTimecode } from "@/lib/domain";
import type { VideoDetail } from "@/lib/queries";
import { cn } from "@/lib/utils";

const HEARTBEAT_MS = 10_000;

/**
 * Player + interactive transcript (spec §6.7).
 *
 * When the video has a real `sourceUrl` this drives a native <video> element.
 * Seeded content has no media file yet, so the same controls drive a simulated
 * clock instead — which keeps the transcript, progress heartbeat, and captions
 * genuinely functional. Swapping in Mux Player replaces only `useTimeline`;
 * see docs/INTEGRATIONS.md.
 */
export function PlayerStage({ video, signedIn }: { video: VideoDetail; signedIn: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasMedia = Boolean(video.sourceUrl);

  const [currentTime, setCurrentTime] = useState(Math.min(video.secondsWatched, video.durationSeconds));
  const [playing, setPlaying] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);

  // --- simulated clock for seeded videos without a media file --------------
  useEffect(() => {
    if (hasMedia || !playing) return undefined;
    const timer = setInterval(() => {
      setCurrentTime((t) => {
        if (t + 1 >= video.durationSeconds) {
          setPlaying(false);
          return video.durationSeconds;
        }
        return t + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [hasMedia, playing, video.durationSeconds]);

  // --- progress heartbeat --------------------------------------------------
  const latestTime = useRef(currentTime);
  latestTime.current = currentTime;

  const report = useCallback(
    (seconds: number) => {
      if (!signedIn) return;
      void fetch("/api/progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: video.id, secondsWatched: Math.round(seconds) }),
        keepalive: true,
      });
    },
    [signedIn, video.id],
  );

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => report(latestTime.current), HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [playing, report]);

  // Flush on unmount so navigating away keeps the last position.
  useEffect(() => () => report(latestTime.current), [report]);

  const seek = useCallback(
    (seconds: number) => {
      const clamped = Math.max(0, Math.min(seconds, video.durationSeconds));
      setCurrentTime(clamped);
      if (videoRef.current) videoRef.current.currentTime = clamped;
    },
    [video.durationSeconds],
  );

  function togglePlay() {
    if (hasMedia && videoRef.current) {
      if (playing) videoRef.current.pause();
      else void videoRef.current.play();
      return;
    }
    setPlaying((p) => {
      if (p) report(latestTime.current);
      return !p;
    });
  }

  const percent = video.durationSeconds > 0 ? (currentTime / video.durationSeconds) * 100 : 0;
  const activeLine = [...video.transcript].reverse().find((line) => line.startSeconds <= currentTime);

  return (
    <div>
      <div className="overflow-hidden rounded-[18px] border-2 border-line bg-[#1c1916]">
        <div className="relative flex aspect-video items-center justify-center bg-[repeating-linear-gradient(45deg,#3a342d,#3a342d_16px,#332e28_16px,#332e28_32px)]">
          {hasMedia ? (
            <video
              ref={videoRef}
              src={video.sourceUrl ?? undefined}
              poster={video.thumbnailUrl ?? undefined}
              className="h-full w-full"
              controls={false}
              onPlay={() => setPlaying(true)}
              onPause={() => {
                setPlaying(false);
                report(latestTime.current);
              }}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onEnded={() => {
                setPlaying(false);
                report(video.durationSeconds);
              }}
            />
          ) : (
            <span className="font-mono text-[0.95em] text-[#b8ac99]">[ lesson video ]</span>
          )}

          {showCaptions && activeLine ? (
            <div className="absolute bottom-5 left-1/2 max-w-[80%] -translate-x-1/2 rounded-lg bg-black/80 px-[18px] py-2.5 text-center text-[1.15em] font-medium text-white">
              {activeLine.text}
            </div>
          ) : null}
        </div>

        <div className="px-5">
          <label className="sr-only" htmlFor="seek">
            Seek within the video
          </label>
          <input
            id="seek"
            type="range"
            min={0}
            max={video.durationSeconds}
            step={1}
            value={Math.round(currentTime)}
            onChange={(event) => seek(Number(event.target.value))}
            className="my-4"
            aria-valuetext={`${formatTimecode(currentTime)} of ${formatTimecode(video.durationSeconds)}`}
          />
          <div
            className="mb-1.5 h-3 overflow-hidden rounded-full bg-[#4a443c]"
            aria-hidden
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
          </div>
          <div className="mb-1.5 flex justify-between text-[0.95em] text-[#b8ac99]">
            <span>{formatTimecode(currentTime)}</span>
            <span>{formatTimecode(video.durationSeconds)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-7 px-6 pb-[22px] pt-3.5">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => seek(currentTime - 10)}
            className="bg-[#3a342d] text-white hover:bg-[#4a443c]"
          >
            <RewindIcon /> 10s
          </Button>

          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-accent text-white"
          >
            {playing ? <PauseIcon size={30} /> : <PlayIcon size={30} />}
          </button>

          <Button
            size="lg"
            variant="ghost"
            aria-pressed={showCaptions}
            onClick={() => setShowCaptions((s) => !s)}
            className={cn("text-white", showCaptions ? "bg-accent" : "bg-[#3a342d]")}
          >
            Subtitles: {showCaptions ? "On" : "Off"}
          </Button>
        </div>
      </div>

      {video.transcript.length > 0 ? (
        <section className="mt-6 rounded-[18px] border-2 border-line bg-surface px-[26px] py-6">
          <h2 className="m-0 mb-1 text-[1.3em]">Transcript</h2>
          <p className="m-0 mb-4 text-[1.02em] text-muted">
            Tap any line to jump the video to that moment.
          </p>
          <ol className="m-0 flex list-none flex-col gap-1 p-0">
            {video.transcript.map((line) => {
              const active = activeLine?.id === line.id;
              return (
                <li key={line.id}>
                  <button
                    type="button"
                    onClick={() => {
                      seek(line.startSeconds);
                      if (!playing) togglePlay();
                    }}
                    aria-current={active}
                    className={cn(
                      "flex w-full items-start rounded-[10px] p-3.5 text-left text-[1.08em] leading-normal",
                      active ? "bg-accent-soft" : "hover:bg-accent-soft/60",
                    )}
                  >
                    <span className="mr-3.5 font-semibold tabular-nums text-accent-dark">
                      {line.timecode}
                    </span>
                    {line.text}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
