import { describe, expect, it } from "vitest";
import { blendIndependentHomeFair } from "../generate-signal-slate.js";

describe("blendIndependentHomeFair", () => {
  it("blends two-way independents without inventing", () => {
    const b = blendIndependentHomeFair([
      { source: "kalshi", homeFairProb: 0.6, awayFairProb: 0.4, capturedAt: "2026-08-09T00:00:00Z" },
      { source: "elo", homeFairProb: 0.55, awayFairProb: 0.45, capturedAt: "2026-08-09T00:00:00Z" },
    ]);
    expect(b).not.toBeNull();
    expect(b!.homeP).toBeGreaterThan(0.5);
    expect(b!.sources).toEqual(["kalshi", "elo"]);
  });

  it("weights sharp sources over near-coin-flip (RES lift)", () => {
    const b = blendIndependentHomeFair([
      { source: "kalshi", homeFairProb: 0.75, awayFairProb: 0.25, capturedAt: "2026-08-09T00:00:00Z" },
      { source: "elo", homeFairProb: 0.51, awayFairProb: 0.49, capturedAt: "2026-08-09T00:00:00Z" },
      { source: "poisson", homeFairProb: 0.5, awayFairProb: 0.5, capturedAt: "2026-08-09T00:00:00Z" },
    ]);
    // Equal-weight would be ~0.587; sharpness-weight pulls toward Kalshi 0.75
    expect(b!.homeP).toBeGreaterThan(0.62);
    expect(b!.homeP).toBeLessThan(0.75);
  });

  it("returns null when no finite independents", () => {
    expect(blendIndependentHomeFair([])).toBeNull();
  });
});

// ============================================================================
// ONE GRADING FUNCTION
// ============================================================================
//
// STALE PIN REMOVED 2026-10-11 (hermes): this file carried a `gradeSignalPick`
// delegation suite asserting an unpriced signal pick may reach SOLID_PLAY at
// confidence >= 65 via computePickGrade(c, null). That design (d3e853574,
// 2026-08-25) was deliberately superseded on main by 97529b60a (2026-09-13,
// "publish one model signal per matchup, and grade it LEAN"): of the 44 rows
// graded SOLID_PLAY or better, 35 (80%) had bookmakerCount 0 - a pure signal
// has no market to measure an edge against, so the lane is LEAN, always, and
// "raising a model signal above LEAN again means giving it a real market to
// be measured against, not a looser threshold". PR #1104's rebase of the
// older design re-introduced this block after that supersession, so the
// export it names does not exist at HEAD and the suite could never run.
// The live invariant ("model-signal lane: grade is LEAN, always") is pinned
// by ./signal-slate-series-and-grade.test.ts, the authoritative suite for
// this contract.
