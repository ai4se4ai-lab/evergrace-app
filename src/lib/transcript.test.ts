import { describe, expect, it } from "vitest";

import { parseTranscript, serializeTranscript } from "./transcript";

describe("parseTranscript", () => {
  it("parses m:ss lines into seconds", () => {
    const result = parseTranscript("0:12  Sit tall.\n2:03  Tuck your chin.");
    expect(result).toEqual({
      ok: true,
      lines: [
        { startSeconds: 12, text: "Sit tall." },
        { startSeconds: 123, text: "Tuck your chin." },
      ],
    });
  });

  it("accepts a bare seconds value", () => {
    const result = parseTranscript("90  Ninety seconds in.");
    expect(result).toEqual({ ok: true, lines: [{ startSeconds: 90, text: "Ninety seconds in." }] });
  });

  it("accepts tabs as the separator", () => {
    const result = parseTranscript("0:40\tBreathe out gently.");
    expect(result).toEqual({ ok: true, lines: [{ startSeconds: 40, text: "Breathe out gently." }] });
  });

  it("ignores blank lines", () => {
    const result = parseTranscript("\n0:05  One.\n\n\n0:10  Two.\n");
    expect(result.ok && result.lines).toHaveLength(2);
  });

  it("sorts out-of-order lines by timecode", () => {
    const result = parseTranscript("2:00  Later.\n0:30  Earlier.");
    expect(result.ok && result.lines.map((l) => l.startSeconds)).toEqual([30, 120]);
  });

  it("trims surrounding whitespace from the text", () => {
    const result = parseTranscript("0:12     Sit tall.   ");
    expect(result.ok && result.lines[0].text).toBe("Sit tall.");
  });

  it("handles timecodes past an hour", () => {
    const result = parseTranscript("75:30  Long session.");
    expect(result.ok && result.lines[0].startSeconds).toBe(75 * 60 + 30);
  });

  it("returns an empty list for empty input rather than failing", () => {
    expect(parseTranscript("")).toEqual({ ok: true, lines: [] });
    expect(parseTranscript("   \n  \n")).toEqual({ ok: true, lines: [] });
  });

  it("rejects a line with no timecode, naming the line number", () => {
    const result = parseTranscript("0:05  Fine.\nNo timecode here.");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("Line 2");
  });

  it("rejects a timecode with no text", () => {
    const result = parseTranscript("0:05  ");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("Line 1");
  });

  it("rejects seconds above 59 when minutes are given", () => {
    const result = parseTranscript("1:75  Impossible.");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("0–59");
  });

  it("truncates a long offending line in the error message", () => {
    const long = `${"x".repeat(80)}`;
    const result = parseTranscript(long);
    expect(!result.ok && result.error).toContain("…");
  });
});

describe("serializeTranscript", () => {
  it("round-trips through parseTranscript", () => {
    const original = "0:12  Sit tall.\n2:03  Tuck your chin.\n10:00  Rest.";
    const parsed = parseTranscript(original);
    expect(parsed.ok && serializeTranscript(parsed.lines)).toBe(original);
  });

  it("zero-pads seconds", () => {
    expect(serializeTranscript([{ startSeconds: 65, text: "One." }])).toBe("1:05  One.");
  });
});
