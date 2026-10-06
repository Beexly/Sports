/**
 * Tests for ./2509-14645v3-market-feed (arXiv:2509.14645v3, lane=markets).
 *
 * ACCEPTANCE GATE: ADAPT confirmed if late-move features add significant explanatory power for CLV beyond final odds (p<0.01 on the move coefficient in at least one league); if no league shows the effect, record the parimutuel-specific boundary.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2509-14645v3-market-feed";

describe("2509-14645v3 Are Final Market Prices Sufficient for", () => {
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
