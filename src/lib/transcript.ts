/**
 * Transcript parsing for the admin bulk editor.
 *
 * Pure, so it is unit-tested directly (see transcript.test.ts) rather than only
 * through the Server Action that calls it. Staff paste `m:ss  text` lines — the
 * format transcription tools export — and a malformed line is *refused with its
 * line number* rather than skipped: a silently dropped caption is worse than an
 * error message.
 */

export type TranscriptLineInput = { startSeconds: number; text: string };

export type ParseResult =
  | { ok: true; lines: TranscriptLineInput[] }
  | { ok: false; error: string };

const LINE_PATTERN = /^(?:(\d{1,3}):)?(\d{1,3})[ \t]+(.*)$/;

export function parseTranscript(input: string): ParseResult {
  const lines: TranscriptLineInput[] = [];

  for (const [index, raw] of input.split("\n").entries()) {
    const line = raw.trim();
    if (line.length === 0) continue;

    const match = line.match(LINE_PATTERN);
    if (!match || match[3].trim().length === 0) {
      return {
        ok: false,
        error: `Line ${index + 1} isn’t in “m:ss  text” form: “${truncate(line)}”`,
      };
    }

    const minutes = match[1] ? Number(match[1]) : 0;
    const seconds = Number(match[2]);

    // Only validate the 0–59 range when a minutes component is present; a bare
    // "90 text" is a legitimate way to write 90 seconds.
    if (match[1] && seconds > 59) {
      return { ok: false, error: `Line ${index + 1}: seconds must be 0–59.` };
    }

    lines.push({ startSeconds: minutes * 60 + seconds, text: match[3].trim() });
  }

  lines.sort((a, b) => a.startSeconds - b.startSeconds);
  return { ok: true, lines };
}

/** Serialises stored lines back into the editor's text format. */
export function serializeTranscript(lines: TranscriptLineInput[]): string {
  return lines
    .map((line) => {
      const minutes = Math.floor(line.startSeconds / 60);
      const seconds = line.startSeconds % 60;
      return `${minutes}:${String(seconds).padStart(2, "0")}  ${line.text}`;
    })
    .join("\n");
}

function truncate(value: string): string {
  return value.length > 40 ? `${value.slice(0, 40)}…` : value;
}
