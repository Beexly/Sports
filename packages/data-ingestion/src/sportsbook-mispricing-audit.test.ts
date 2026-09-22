/**
 * Tests for ./sportsbook-mispricing-audit (arXiv:2306.01740v4, lane=markets).
 *
 * ACCEPTANCE GATE: ADOPT the QA protocol (no further test needed - the filters are cheap insurance); for the
 * reproducible test: if dropping flagged odds rows changes the 2025 backtest ROI of any published
 * GSE strategy by more than +/-2 pp, or flips any strategy from p_bs < 0.05 to > 0.05, treat the
 * published P&L as data-error-contaminated and re-issue corrected figures before posting any new
 * picks.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./sportsbook-mispricing-audit";

describe("sportsbook mispricing audit (arXiv:2306.01740v4)", () => {
  const lines = [
    { gameId: "g1", market: "ml", book: "a", price: 1.5, impliedProb: 0.65, realized: 1 },
    { gameId: "g2", market: "ml", book: "a", price: 2.5, impliedProb: 0.38, realized: 0 },
    { gameId: "g3", market: "ml", book: "a", price: 1.8, impliedProb: 0.53, realized: 1 },
    { gameId: "g4", market: "ml", book: "b", price: 3.0, impliedProb: 0.31, realized: 0 },
    { gameId: "g5", market: "ml", book: "b", price: 1.4, impliedProb: 0.69, realized: 1 },
  ];
  it("mispricing slope", () => {
    const s = mod.mispricingSlope(lines)!;
    expect(Number.isFinite(s.slope)).toBe(true);
    expect(mod.mispricingSlope([])).toBeNull();
    expect(mod.mispricingSlope([{ ...lines[0], realized: null }])).toBeNull();
  });
  it("FLB diagnosis", () => {
    expect(mod.flbDiagnosis(1.0)).toBe("fair");
    expect(mod.flbDiagnosis(0.7)).toBe("longshots-overpriced");
    expect(mod.flbDiagnosis(1.3)).toBe("favorites-overpriced");
    expect(mod.flbDiagnosis(NaN)).toBeNull();
  });
  it("book audit", () => {
    const a = mod.bookBiasAudit(lines);
    expect(a["a"]!.n).toBe(3);
    expect(a["b"]!.n).toBe(2);
    expect(a["a"]!.slope).not.toBeNull();
  });
  it("isBookLine rejects malformed", () => {
    expect(mod.isBookLine({ ...lines[0], impliedProb: 1.5 })).toBe(false);
  });
});
