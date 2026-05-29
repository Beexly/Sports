/**
 * C66 — Voice consistency tests.
 *
 * Runs the voice-lint scanner across canned coach responses, fallback
 * copy, and the manifesto beats. Failures here are blocking — they
 * indicate the voice is drifting.
 */

import { describe, it, expect } from "vitest";
import { scanVoiceDrift, hasVoiceDrift, scanCorpus } from "@/lib/brand/voice-lint";
import { CANNED_RESPONSES } from "@/lib/coach/canned-responses";
import { FALLBACK_COPY } from "@/lib/degraded-mode/fallback-copy";

describe("voice-lint scanner — unit", () => {
  it("returns empty for clean copy", () => {
    expect(scanVoiceDrift("The model passed on this game. Read the no-bet list.")).toEqual([]);
    expect(hasVoiceDrift("Edge index 67. Evidence health 82/100.")).toBe(false);
  });

  it("flags corporate-ese", () => {
    const hits = scanVoiceDrift("We apologize for any inconvenience.");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.category).toBe("corporate-ese");
  });

  it("flags certainty language", () => {
    expect(hasVoiceDrift("This is the lock of the day.")).toBe(true);
    expect(hasVoiceDrift("Guaranteed winner.")).toBe(true);
    expect(hasVoiceDrift("Risk-free play.")).toBe(true);
  });

  it("flags tout framing", () => {
    expect(hasVoiceDrift("Tail the sharps.")).toBe(true);
    expect(hasVoiceDrift("AI picks the winners.")).toBe(true);
    expect(hasVoiceDrift("Beat the books.")).toBe(true);
  });

  it("flags marketing fluff", () => {
    expect(hasVoiceDrift("World-class research.")).toBe(true);
    expect(hasVoiceDrift("Industry-leading model.")).toBe(true);
    expect(hasVoiceDrift("Best-in-class evidence.")).toBe(true);
  });

  it("flags hedge filler", () => {
    expect(hasVoiceDrift("This could potentially be an edge.")).toBe(true);
    expect(hasVoiceDrift("In order to win, you must read the evidence.")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(hasVoiceDrift("GUARANTEED PROFIT")).toBe(true);
    expect(hasVoiceDrift("World-Class")).toBe(true);
  });
});

describe("voice-lint scanner — canned coach responses", () => {
  it("every canned response is voice-clean", () => {
    const failures = scanCorpus(
      CANNED_RESPONSES.map((r) => ({ id: r.promptId, copy: r.body })),
    );
    if (failures.length > 0) {
      const details = failures
        .map((f) => `${f.id}: ${f.hits.map((h) => `[${h.category}] "${h.phrase}"`).join(", ")}`)
        .join("\n");
      throw new Error(`Voice drift in canned responses:\n${details}`);
    }
    expect(failures).toEqual([]);
  });
});

describe("voice-lint scanner — fallback copy", () => {
  it("every fallback copy entry is voice-clean", () => {
    const entries = Object.entries(FALLBACK_COPY).flatMap(([key, copy]) => [
      { id: `${key}.title`, copy: copy.title },
      { id: `${key}.body`, copy: copy.body },
    ]);
    const failures = scanCorpus(entries);
    if (failures.length > 0) {
      const details = failures
        .map((f) => `${f.id}: ${f.hits.map((h) => `[${h.category}] "${h.phrase}"`).join(", ")}`)
        .join("\n");
      throw new Error(`Voice drift in fallback copy:\n${details}`);
    }
    expect(failures).toEqual([]);
  });
});
