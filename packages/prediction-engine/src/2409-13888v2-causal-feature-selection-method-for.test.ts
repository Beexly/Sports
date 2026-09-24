/**
 * Vitest suite for arXiv:2409.13888v2 (Causal Feature Selection Method for Contextual Multi-Armed Bandits in Recommender System).
 * Gate: ADAPT if on the GSE 2025 holdout replay (a) HIE/HDD rank a known-spurious correlate (e.g., raw team win%) below true HTE features like line-movement buckets, AND (b) the LinUCB selector using HIE/HDD top features beats the correlation-selected selector by ≥ 1.5 ROI points per 100 picks.
 */
import { describe, it, expect } from "vitest";
import { rankByCausalScore, rankByCorrelation, rollingHie, causalFeatureScore } from "./2409-13888v2-causal-feature-selection-method-for";

describe("2409-13888v2 causal HIE/HDD feature selection", () => {
  const feats = [
    { name: "raw_win_pct", corr: 0.45, hie: 0.02, hdd: 0.01 },   // known-spurious correlate
    { name: "line_move_bucket", corr: 0.20, hie: 0.30, hdd: 0.10 },
    { name: "clv_bucket", corr: 0.25, hie: 0.05, hdd: 0.35 },
  ];
  it("ranks the spurious correlate below true HTE features", () => {
    const ranked = rankByCausalScore(feats);
    const names = ranked.map((f) => f.name);
    expect(names.indexOf("raw_win_pct")).toBeGreaterThan(names.indexOf("line_move_bucket"));
    expect(rankByCorrelation(feats)[0]!.name).toBe("raw_win_pct"); // correlation is fooled
  });
  it("rolling HIE smooths with the half-life decay", () => {
    const m = rollingHie([
      [{ name: "a", hie: 1 }],
      [{ name: "a", hie: 1 }],
    ], 1);
    // decay=0.5: after w1 -> 0.5, after w2 -> 0.5*0.5+0.5 = 0.75
    expect(m.get("a")).toBeCloseTo(0.75, 10);
  });
});
