"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveTranscript } from "@/actions/admin-video";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";

/**
 * Bulk transcript editor. One `m:ss  text` line per caption — quicker for staff
 * than a row-per-line form, and it is what a transcription tool exports anyway.
 * The server parses strictly and names the offending line, so nothing is dropped
 * silently.
 */
export function TranscriptEditor({
  videoId,
  initialText,
}: {
  videoId: string;
  initialText: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const lineCount = text.split("\n").filter((line) => line.trim().length > 0).length;
  const dirty = text !== initialText;

  function save() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await saveTranscript({ videoId, text });
      if (!result.ok) {
        setError(result.message ?? "That transcript couldn’t be parsed.");
        return;
      }
      setMessage(result.message ?? "Saved.");
      router.refresh();
    });
  }

  return (
    <div>
      <p className="m-0 mb-4 text-muted">
        One caption per line, starting with its timecode: <code>0:12  Sit tall, feet flat…</code>{" "}
        Members tap a line to jump the video there.
      </p>

      <label className="sr-only" htmlFor="transcript">
        Transcript lines
      </label>
      <Textarea
        id="transcript"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={14}
        spellCheck
        className="min-h-[320px] font-mono text-[0.95em]"
        placeholder={"0:12  Sit tall, feet flat on the floor.\n0:40  Now let the breath out gently."}
      />

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <span className="text-muted">
          {lineCount} line{lineCount === 1 ? "" : "s"}
          {dirty ? " · unsaved changes" : ""}
        </span>
        <Button size="md" className="ml-auto" disabled={pending || !dirty} onClick={save}>
          {pending ? "Saving…" : "Save transcript"}
        </Button>
      </div>

      {error ? (
        <p className="mt-4 font-semibold text-warn" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 font-semibold text-success" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
