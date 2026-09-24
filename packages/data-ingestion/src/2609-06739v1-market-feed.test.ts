/**
 * Tests for ./2609-06739v1-market-feed (arXiv:2609.06739v1, lane=markets).
 *
 * ACCEPTANCE GATE: ADOPT the decomposition framework if, on 2024-2025 NFL spreads/totals: (a) the pipeline reproduces the paper's qualitative pattern - a pooled losing-side share significantly != 50% that shrinks toward zero (|gap| < 2 pp, p > 0.10) under favorite-identity stratification - OR finds a stratified gap that survives (|gap| >= 3 pp, p < 0.05), which would be a genuine, tradable public-bias signal; and (b) the three-component profit attribution is computable for >= 90% of games without manual intervention. REJECT (keep as reference only) if split coverage is too sparse (< 60% of games) or the decomposition terms are numerically unstable.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2609-06739v1-market-feed";

describe("2609-06739v1 The profit-bias identity in sports betting:", () => {
  it("american odds convert to implied probability", () => {
    expect(mod.americanToImplied(-110)).toBeCloseTo(0.5238, 3);
    expect(mod.americanToImplied(150)).toBeCloseTo(0.4, 10);
    expect(mod.americanToImplied(50)).toBeNull();
    expect(mod.americanToImplied(0)).toBeNull();
  });
  it("devig normalizes the overround away", () => {
    const d = mod.devig([0.55, 0.55])!;
    expect(d[0]! + d[1]!).toBeCloseTo(1, 10);
    expect(mod.devig([0.5, -0.1])).toBeNull();
  });
  it("clv is positive when beating the close", () => {
    expect(mod.clvPct(-110, -130)!).toBeGreaterThan(0);
    expect(mod.clvPct(-130, -110)!).toBeLessThan(0);
    expect(mod.clvPct(-110, -110)).toBeCloseTo(0, 10);
  });
  it("consensus line is the median", () => {
    expect(mod.consensusLine([-3, -3.5, -7])).toBeCloseTo(-3.5, 10);
    expect(mod.consensusLine([-3, -4])).toBeCloseTo(-3.5, 10);
    expect(mod.consensusLine([])).toBeNull();
  });
  it("steam magnitude takes the largest absolute move", () => {
    expect(mod.steamMagnitude([0.5, -2.5, 1])).toBeCloseTo(2.5, 10);
  });
});
