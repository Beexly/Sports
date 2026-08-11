import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildCalibrationProposalDraft,
  assertCannotSatisfyModelFreeze,
  PROPOSAL_MIN_N,
  type CalibrationProposalRow,
} from "../lib/ops/calibration-proposal-draft";
import { MIN_COMPARISON_SAMPLE } from "../lib/ops/shadow-vs-live-report";

const VERSION = "v5.2.6";
const AT = "2026-08-11T00:00:00.000Z";

function row(
  i: number,
  shadowProb: number,
  liveConfidence: number | null,
  outcome: 0 | 1,
  marketProb = 0.5,
  modelVersion = VERSION,
): CalibrationProposalRow {
  return {
    gameId: `g${i}`,
    modelVersion,
    shadowProb,
    marketProb,
    liveConfidence,
    outcome,
    settledAt: new Date(Date.UTC(2026, 7, 1 + (i % 28))),
  };
}

/** n rows where shadow is sharp and correct, live is a coin flip, market is uninformative. */
function shadowWins(n: number, modelVersion = VERSION): CalibrationProposalRow[] {
  return Array.from({ length: n }, (_, i) =>
    row(i, i % 2 === 0 ? 0.85 : 0.15, 50, i % 2 === 0 ? 1 : 0, 0.5, modelVersion),
  );
}

function build(rows: readonly CalibrationProposalRow[], requestedN = 200) {
  return buildCalibrationProposalDraft({
    rows,
    modelVersion: VERSION,
    requestedN,
    generatedAt: AT,
  });
}

describe("buildCalibrationProposalDraft", () => {
  it("always renders status OPEN, even when every automated condition is met", () => {
    const draft = build(shadowWins(PROPOSAL_MIN_N + 20));
    expect(draft.validity.meetsAutomatedFloor).toBe(true);
    expect(draft.markdown).toContain("status: OPEN");
  });

  it("refuses to emit a draft the model-freeze guardrail would accept as IMPLEMENTED", () => {
    // The regression this guards: an OPEN draft whose PROSE contains the literal
    // "status: IMPLEMENTED" (e.g. explaining how to promote it) is enough for
    // model-freeze.mjs, which regexes the whole file rather than parsing
    // front-matter. Such a draft would turn the guardrail green while declaring
    // itself not-evidence.
    expect(() =>
      assertCannotSatisfyModelFreeze("modelVersion: v5.2.6\nstatus: IMPLEMENTED\n"),
    ).toThrow(/defeats the guardrail/);

    // Prose mentioning promotion must not trip it either.
    expect(() =>
      assertCannotSatisfyModelFreeze("promote this to status: IMPLEMENTED in seed.ts"),
    ).toThrow();

    // Describing the target WITHOUT the colon pairing is what the renderer does.
    expect(() =>
      assertCannotSatisfyModelFreeze("promoted into an IMPLEMENTED-status record"),
    ).not.toThrow();
  });

  it("produces markdown that the real model-freeze guardrail does NOT accept", () => {
    // Reads the guardrail's own detectors out of the shipped script instead of
    // restating them, so a change there fails this test rather than drifting.
    const guard = readFileSync(
      path.resolve(__dirname, "../../../scripts/guardrails/model-freeze.mjs"),
      "utf8",
    );
    expect(guard).toContain("hasDocProposal");

    const draft = build(shadowWins(PROPOSAL_MIN_N + 20));

    const versionMatches = new RegExp(
      `modelVersion\\s*:\\s*["']?${VERSION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']?`,
      "i",
    ).test(draft.markdown);
    const statusMatches = /status\s*:\s*["']?IMPLEMENTED["']?/i.test(draft.markdown);

    // The version line legitimately matches — that is the front-matter format.
    expect(versionMatches).toBe(true);
    // The status detector must not. Both are required for the guardrail to pass.
    expect(statusMatches).toBe(false);
  });

  it("scores only rows carrying the target model version, and reports the exclusions", () => {
    const rows = [...shadowWins(30), ...shadowWins(7, "v5.2.5")];
    const draft = build(rows);

    expect(draft.fetchedRows).toBe(37);
    expect(draft.currentVersionRows).toBe(30);
    expect(draft.excludedOtherVersionRows).toBe(7);
    expect(draft.report.comparedGames).toBe(30);
    expect(draft.validity.noCrossVersionContamination).toBe(false);
    expect(draft.markdown).toContain("v5.2.5: 7 row(s)");
  });

  it("passes the contamination check when every row is the target version", () => {
    expect(build(shadowWins(30)).validity.noCrossVersionContamination).toBe(true);
  });

  it("fails the proposal-sample floor between the comparison floor and PROPOSAL_MIN_N", () => {
    const draft = build(shadowWins(MIN_COMPARISON_SAMPLE + 5));
    expect(draft.validity.meetsComparisonFloor).toBe(true);
    expect(draft.validity.meetsProposalSample).toBe(false);
    expect(draft.validity.meetsAutomatedFloor).toBe(false);
    expect(draft.markdown).toContain("DOES NOT yet meet the automated validity floor");
  });

  it("does not claim a floor is met when the shadow engine loses", () => {
    // Shadow is confidently WRONG every time.
    const rows = Array.from({ length: PROPOSAL_MIN_N + 20 }, (_, i) =>
      row(i, i % 2 === 0 ? 0.1 : 0.9, 50, i % 2 === 0 ? 1 : 0),
    );
    const draft = build(rows);
    expect(draft.validity.shadowBetter).toBe(false);
    expect(draft.validity.meetsAutomatedFloor).toBe(false);
  });

  it("does not credit a shadow engine that loses to the market", () => {
    // Market is perfectly sharp; shadow is a coin flip; live is worse than both.
    const rows = Array.from({ length: PROPOSAL_MIN_N + 20 }, (_, i) =>
      row(i, 0.5, 50, i % 2 === 0 ? 1 : 0, i % 2 === 0 ? 0.99 : 0.01),
    );
    const draft = build(rows);
    expect(draft.validity.beatsMarket).toBe(false);
    expect(draft.validity.meetsAutomatedFloor).toBe(false);
  });

  it("handles an empty result set without throwing and reports insufficient sample", () => {
    const draft = build([]);
    expect(draft.fetchedRows).toBe(0);
    expect(draft.currentVersionRows).toBe(0);
    expect(draft.report.verdict).toBe("insufficient-sample");
    expect(draft.validity.meetsAutomatedFloor).toBe(false);
    expect(draft.markdown).toContain("no settled ShadowSignal rows found");
    expect(draft.markdown).toContain("status: OPEN");
  });

  it("keeps the two human-review items permanently unchecked", () => {
    const draft = build(shadowWins(PROPOSAL_MIN_N + 20));
    expect(draft.markdown).toContain("- [ ] holds across >= 2 independent weekly");
    expect(draft.markdown).toContain("- [ ] reviewed by a human");
  });

  it("is deterministic — same rows and timestamp produce identical markdown", () => {
    const rows = shadowWins(40);
    expect(build(rows).markdown).toBe(build(rows).markdown);
  });
});
