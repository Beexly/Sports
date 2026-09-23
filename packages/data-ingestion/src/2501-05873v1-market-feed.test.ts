/**
 * Tests for ./2501-05873v1-market-feed (arXiv:2501.05873v1, lane=markets).
 *
 * ACCEPTANCE GATE: Adopt the simulation-pipeline variant if, on walk-forward 2024 weeks 1–18, its moneyline Brier score beats the bookmaker-consensus-implied Brier by ≥0.002 AND beats GSE's current engine Brier by ≥0.002. Reject if it trails the bookmaker baseline.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2501-05873v1-market-feed";

describe("2501-05873v1 Forecasting Soccer Matches through Distributions", () => {
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
