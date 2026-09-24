/**
 * Tests for ./2607-14430v1-market-feed (arXiv:2607.14430v1, lane=markets).
 *
 * ACCEPTANCE GATE: ADAPT the TTE-conditional calibration into GSE's market-implied pipeline if, on one held-out NFL season: (a) the [0,10)-minute bucket gamma-hat differs from the pooled estimate with p<0.05 AND the TTE-conditional map improves log-loss over the pooled map by >=0.005 nats; (b) for parlays, adopt the parlay-specific calibration only if median R deviates from 1.0 by >=2% in the 2-5 leg cells.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2607-14430v1-market-feed";

describe("2607-14430v1 Prices, Probabilities, and Parlays: Systematic Bias", () => {
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
