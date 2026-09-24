/**
 * Tests for ./tournament-win-prob (arXiv:2307.10411v1, lane=experimental).
 *
 * ACCEPTANCE GATE: ADOPT if: the exact bracket DP reproduces brute-force enumeration on toy brackets exactly, runs
 * in <1s on the full 14-team bracket, and on the 2023-2025 backtest the 100k-run Monte Carlo shows
 * max team-level Super Bowl probability error >0.25% points in at least 2 of 3 seasons (proving
 * simulation noise is worth eliminating); REJECT (keep Monte Carlo) if GSE's playoff probabilities
 * are consumed only as coarse tiers AND the Monte Carlo serves double duty producing joint
 * distributions the marginal DP cannot supply.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./tournament-win-prob";

describe("tournament win prob (arXiv:2307.10411v1)", () => {
  it("4-team bracket exact", () => {
    const p = mod.tournamentWinProb(4, mod.btMatrix([2, 1, 0, -1]))!;
    expect(mod.sumsToOne(p)).toBe(true);
    expect(p[0]).toBeGreaterThan(p[3]!);
    expect(p[0]).toBeGreaterThan(p[1]!);
  });
  it("8-team", () => {
    const p = mod.tournamentWinProb(8, mod.btMatrix([3, 2, 1, 0, 0, -1, -2, -3]))!;
    expect(mod.sumsToOne(p)).toBe(true);
    expect(mod.favoriteTitleProb(p)).toBe(p[0]);
  });
  it("null on malformed", () => {
    expect(mod.tournamentWinProb(3, mod.btMatrix([1, 2, 3]))).toBeNull();
    expect(mod.tournamentWinProb(4, () => null)).toBeNull();
    expect(mod.favoriteTitleProb([])).toBeNull();
  });
});
