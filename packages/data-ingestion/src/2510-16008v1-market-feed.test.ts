/**
 * Tests for ./2510-16008v1-market-feed (arXiv:2510.16008v1, lane=markets).
 *
 * ACCEPTANCE GATE: ADAPT if the LSTM-attention model on 2024 holdout: (a) beats baselines by >=3pp accuracy on 3-class line-move direction, AND (b) the wait/bet timing backtest shows >=+0.5 points mean CLV improvement.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2510-16008v1-market-feed";

describe("2510-16008v1 Convolutional Attention in Betting Exchange Markets", () => {
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
