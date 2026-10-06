/**
 * Tests for ./2608-12291v1-market-feed (arXiv:2608.12291v1, lane=markets).
 *
 * ACCEPTANCE GATE: Adopt the timed-decision module if, on a holdout season of live-bet backtests, the optimal-stopping policy achieves >=10% lower realized Bayes risk than the best fixed-threshold baseline AND the estimated sigma(pi) is stable across seasons (per-decile quadratic-variation estimates within +-25% year over year). Reject if the gain over fixed thresholds is <5% — then the theory adds nothing over a tuned heuristic.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2608-12291v1-market-feed";

describe("2608-12291v1 When should one stop the most", () => {
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
