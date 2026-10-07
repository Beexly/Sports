import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Edge Index copy-truth guard.
 *
 * Source of truth: `packages/prediction-engine/src/scoring.ts`.
 *
 *   toEdgeIndex(edgeScore)      = clamp(round(edgeScore), 0, 100)   (~:107)
 *   edgeScore                   = clamp(round((edgeComponentScore
 *                                   / EDGE_COMPONENT_MAX) * 100), 0, 100)
 *   edgeComponentScore          = clamp((rawEdge + 0.05) / 0.10, 0, 1) * 25
 *   EDGE_COMPONENT_MAX          = 25            (constants.ts:56)
 *
 * Substituting: EdgeIndex = 50 + 1000 * rawEdge, and
 *
 *   rawEdge = pickedSideFairProb - offeredProb                      (~:300)
 *
 * where `pickedSideFairProb` is the proportionally DE-VIGGED probability
 * (`removeVig`, scoring.ts:70, returns p / (pA + pB)) of the same books'
 * average implied prices, and `offeredProb` is the WITH-vig implied
 * probability of the offered average price for that side.
 *
 * Two facts follow, and both are what this guard protects:
 *
 *   1. NOTHING calibrates the Edge Index. `toEdgeIndex` is identity plus a
 *      clamp. There is no fitting step, no historical mapping, no lookup
 *      against settled results anywhere in the path. Describing the index
 *      with a fitted-sounding adjective claims a step the code never runs.
 *
 *   2. NO code relates an Edge Index value to a win rate or a loss rate.
 *      `rawEdge` is a price comparison in probability points, not an outcome
 *      forecast, and no table, model, or query maps an index value to a
 *      historical hit rate. Sentences of the form "a 71 Edge Index still
 *      loses ~29 times in 100" are therefore unbacked numbers: they invent a
 *      loss rate out of an index point value, and they contradict the same
 *      passage's own "not a probability the pick wins".
 *
 * A percentage is deliberately NOT treated as a hit by the loss-rate
 * detector: "a 64% probability loses 36 of 100 times" is arithmetic on a
 * stated rate, not a rate conjured from an index point value. The defect this
 * guard exists for is the conversion of an INDEX POINT VALUE into an outcome
 * frequency, which is precisely the step no code performs.
 */

// ============================================================
// Detector 1 — a loss/win frequency derived from an index point value
// ============================================================

/**
 * An index point value used as a subject: "71 Edge Index", "Edge Index 71",
 * "Edge Index of 71", "71-confidence", "71 confidence".
 *
 * The separator class deliberately excludes "%", so "64% confidence" does NOT
 * match: a stated percentage is a rate already, and reasoning from it is
 * arithmetic rather than fabrication. Only a bare SCORE being spoken of as if
 * it were a rate is in scope here.
 */
const INDEX_VALUE_SUBJECT =
  /(?:\b\d{1,3}[-\s]?(?:edge index|confidence)\b)|(?:\bedge index\s*(?:of\s*)?\d{1,3}\b)/i;

/**
 * A quantified outcome frequency: "loses ~29 times in 100", "still loses 36
 * of 100 times", "wins 71 out of 100", "hits 29 in 100".
 */
const OUTCOME_FREQUENCY =
  /\b(?:lose|loses|losing|lost|win|wins|winning|won|hit|hits)\b[^.\n]{0,24}?(?:~|about |roughly |approximately )?\d{1,3}\s*(?:times\s+)?(?:out\s+of|of|in)\s+(?:a\s+)?(?:100|hundred)\b/i;

/**
 * True when `text` contains a sentence that converts an Edge Index (or bare
 * confidence-score) point value into an outcome frequency.
 *
 * Both halves must appear inside the SAME sentence, so an index mentioned in
 * one sentence and an unrelated frequency in the next does not false-positive.
 */
export function assertsIndexDerivedOutcomeRate(text: string): boolean {
  return sentencesOf(text).some(
    (s) => INDEX_VALUE_SUBJECT.test(s) && OUTCOME_FREQUENCY.test(s),
  );
}

/** Split on sentence terminators and newlines. Crude on purpose: a guard that
 *  over-segments can only become MORE conservative about pairing, never less. */
function sentencesOf(text: string): string[] {
  return text.split(/(?<=[.!?])\s+|\n/);
}

// ============================================================
// Detector 2 — the Edge Index described as fitted to results
// ============================================================

/** The bare adjective/gerund. "Calibration Report" and "calibrates" are not
 *  matched: the first is a real, separately-gated product surface, and the
 *  second appears only in engineering notes denying the claim. */
const FITTED_ADJECTIVE = /\bcalibrat(?:ed|ing)\b/gi;

/** Characters inspected on each side of the adjective for an "Edge Index". */
const FITTED_WINDOW_CHARS = 220;

/**
 * True when `text` describes the Edge Index as calibrated. `toEdgeIndex` is
 * identity-with-clamp, so this claims a fitting step the engine never runs.
 *
 * The window spans newlines because the FAQ stores the claim as a `q` / `a`
 * pair on adjacent lines: the question names the Edge Index, the answer
 * carries the adjective.
 */
export function callsEdgeIndexCalibrated(text: string): boolean {
  for (const m of text.matchAll(FITTED_ADJECTIVE)) {
    const idx = m.index ?? 0;
    const start = Math.max(0, idx - FITTED_WINDOW_CHARS);
    const end = Math.min(text.length, idx + m[0].length + FITTED_WINDOW_CHARS);
    if (/edge index/i.test(text.slice(start, end))) return true;
  }
  return false;
}

// ============================================================
// Detector unit tests — both directions
// ============================================================

/**
 * The exact sentences removed from the public surface. Pinned verbatim so the
 * guard is demonstrably the thing that catches THEM, not merely something
 * shaped like them.
 */
const REMOVED_FAQ_CLAIM =
  "A calibrated 0-100 confidence rating on every signal. Not a probability the pick wins, but a measure of how much the market is offering vs. what the model thinks the matchup is worth. A 71 Edge Index still loses ~29 times in 100. Variance is described, not hidden.";

const REMOVED_VARIANCE_LINE =
  "A 71-confidence signal still loses ~29 of 100. Treat as one input.";

describe("assertsIndexDerivedOutcomeRate", () => {
  it("catches the exact FAQ sentence that was removed", () => {
    expect(assertsIndexDerivedOutcomeRate(REMOVED_FAQ_CLAIM)).toBe(true);
  });

  it("catches the exact sample-signal variance line that was removed", () => {
    expect(assertsIndexDerivedOutcomeRate(REMOVED_VARIANCE_LINE)).toBe(true);
  });

  it("catches the same fabrication in its other phrasings", () => {
    expect(
      assertsIndexDerivedOutcomeRate("An Edge Index of 71 wins 71 out of 100."),
    ).toBe(true);
    expect(
      assertsIndexDerivedOutcomeRate("Edge Index 82 still loses 18 in 100 times."),
    ).toBe(true);
    expect(
      assertsIndexDerivedOutcomeRate("A 71 confidence signal hits roughly 71 of 100."),
    ).toBe(true);
  });

  it("does not fire on the replacement copy", () => {
    expect(
      assertsIndexDerivedOutcomeRate(
        "A 0-100 rendering of a single arithmetic gap: the no-vig fair probability the books imply for the side we picked, minus the probability implied by the price actually offered on that side. It is not a probability the pick wins, and nothing fits it to settled results.",
      ),
    ).toBe(false);
    expect(
      assertsIndexDerivedOutcomeRate(
        "The Edge Index is not a probability the pick wins. Treat as one input.",
      ),
    ).toBe(false);
  });

  it("does not fire on arithmetic from a STATED percentage", () => {
    // A percentage is already a rate. Reasoning from one is arithmetic, not an
    // invented number, and this guard must not push honest variance copy off
    // the site to stay quiet.
    expect(
      assertsIndexDerivedOutcomeRate(
        "A signal with a 64% probability still loses 36 out of 100 times.",
      ),
    ).toBe(false);
  });

  it("does not pair an index in one sentence with a frequency in the next", () => {
    expect(
      assertsIndexDerivedOutcomeRate(
        "The Edge Index 71 chip is a preview render. Coin flips lose 50 of 100 times.",
      ),
    ).toBe(false);
  });
});

describe("callsEdgeIndexCalibrated", () => {
  it("catches the exact FAQ sentence that was removed", () => {
    expect(
      callsEdgeIndexCalibrated(`q: "What's the Edge Index?",\n${REMOVED_FAQ_CLAIM}`),
    ).toBe(true);
  });

  it("catches the sample-signal callout that was removed", () => {
    expect(
      callsEdgeIndexCalibrated(
        "A calibrated 0-100 Edge Index. Not a probability the pick wins.",
      ),
    ).toBe(true);
  });

  it("does not fire on the replacement copy", () => {
    expect(
      callsEdgeIndexCalibrated(
        "The 0-100 Edge Index: the no-vig fair probability the books imply for this side, minus the probability implied by the price offered on it. Not a probability the pick wins, and not fitted to settled results.",
      ),
    ).toBe(false);
  });

  it("does not fire on the separately-gated Calibration Report", () => {
    expect(
      callsEdgeIndexCalibrated(
        "The Calibration Report stays gated until enough settled signals accumulate. The Edge Index publishes from day one.",
      ),
    ).toBe(false);
  });
});

// ============================================================
// Surface scan — the claims cannot come back anywhere public
// ============================================================

const SCAN_ROOTS = ["app", "components"] as const;
const SKIP_DIRS = new Set(["api", "cockpit", "node_modules", ".next"]);

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts|mdx)$/.test(name)) acc.push(p);
  }
  return acc;
}

function publicCopyFiles(): string[] {
  const out: string[] = [];
  for (const root of SCAN_ROOTS) walk(join(process.cwd(), root), out);
  return out;
}

describe("Edge Index copy truth on public surfaces", () => {
  it("no public surface derives a win or loss rate from an index value", () => {
    const hits = publicCopyFiles().filter((f) =>
      assertsIndexDerivedOutcomeRate(readFileSync(f, "utf8")),
    );
    expect(hits).toEqual([]);
  });

  it("no public surface describes the Edge Index as calibrated", () => {
    const hits = publicCopyFiles().filter((f) =>
      callsEdgeIndexCalibrated(readFileSync(f, "utf8")),
    );
    expect(hits).toEqual([]);
  });

  it("scans a non-trivial number of files (the scan is not vacuous)", () => {
    expect(publicCopyFiles().length).toBeGreaterThan(50);
  });
});
