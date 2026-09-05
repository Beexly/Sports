import { describe, expect, it } from "vitest";
import { buildProvenPathPlan, type ProvenPathPickRow } from "@/lib/calibration/proven-path-engine";

/**
 * Ledger C-28: the pooled bake-off mixes a moneyline probability claim with
 * spread/total rows priced near a coin flip, so it cannot say what number a
 * floor is being applied to. The plan now carries the same metrics per
 * (score, market). Fixture: 120 moneyline rows whose market fair is well
 * calibrated, 120 spread rows with a coin-flip market fair.
 */
function rows(): ProvenPathPickRow[] {
  const out: ProvenPathPickRow[] = [];
  for (let i = 0; i < 120; i++) {
    // Deterministic, calibrated-by-construction moneyline market fair: p in
    // {0.6, 0.7, 0.8}, outcome frequency matches p exactly within each level.
    const p = [0.6, 0.7, 0.8][i % 3]!;
    const idx = Math.floor(i / 3); // 0..39 within each level
    const y = (idx / 40 < p ? 1 : 0) as 0 | 1;
    out.push({ pConfidence: 0.5 + (i % 10) * 0.02, pIndependent: null, marketP: p, y, groupKey: "americanfootball_nfl|MONEYLINE" });
  }
  for (let i = 0; i < 120; i++) {
    out.push({ pConfidence: 0.55 + (i % 7) * 0.01, pIndependent: null, marketP: 0.5 + (i % 2 ? 0.02 : -0.02), y: (i % 2) as 0 | 1, groupKey: "americanfootball_nfl|SPREAD" });
  }
  return out;
}

describe("scoreBakeoffByMarket", () => {
  const plan = buildProvenPathPlan(rows(), { minN: 40 });

  it("reports every score kind per market with within-market coverage", () => {
    const byMarket = plan.scoreBakeoffByMarket ?? [];
    expect(byMarket.length).toBeGreaterThan(0);
    const markets = [...new Set(byMarket.map((r) => r.market))];
    expect(markets).toEqual(["MONEYLINE", "SPREAD"]);
    const mlMarket = byMarket.find((r) => r.market === "MONEYLINE" && r.score === "marketFairProb")!;
    expect(mlMarket.n).toBe(120);
    expect(mlMarket.coverage).toBe(1);
    // No independent trueProb in the fixture: those rows are absent, never zero-filled.
    expect(byMarket.some((r) => r.score === "independent_trueProb")).toBe(false);
  });

  it("separates the moneyline market number from the coin-flip spread number", () => {
    const byMarket = plan.scoreBakeoffByMarket ?? [];
    const ml = byMarket.find((r) => r.market === "MONEYLINE" && r.score === "marketFairProb")!;
    const spread = byMarket.find((r) => r.market === "SPREAD" && r.score === "marketFairProb")!;
    const pooled = plan.scoreBakeoff.find((r) => r.score === "marketFairProb")!;
    // Calibrated-by-construction moneyline clears the floor; the coin-flip spread cannot.
    expect(ml.brier).toBeLessThan(0.22);
    expect(ml.ece).toBeLessThan(0.05);
    expect(spread.brier).toBeGreaterThan(0.22);
    // The pooled row sits between them and hides both facts.
    expect(pooled.brier).toBeGreaterThan(ml.brier);
    expect(pooled.brier).toBeLessThan(spread.brier);
    expect(pooled.n).toBe(ml.n + spread.n);
  });

  it("leaves the pooled bake-off and bestScore selection unchanged", () => {
    expect(plan.scoreBakeoff.map((r) => r.score)).toEqual(["confidence", "independent_trueProb", "blend_indep_conf", "marketFairProb"]);
    expect(plan.floorsUnchanged).toBe(true);
    expect(plan.rankingPolarityLaw).toBe("positive_separation_required");
  });
});
