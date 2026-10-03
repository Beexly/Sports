/**
 * Tests for ./football-forecast-verification (arXiv:2106.14345v2, lane=calibration).
 *
 * ACCEPTANCE GATE: Adopt the suite as the standard diagnostic if: on the 2025 test window, the decomposition
 * reveals an actionable deficiency the current Brier-only reporting misses — e.g., RES_GSE <
 * RES_market - 0.03 on either event, or the logistic test rejects alpha=0 at p<0.01 for a GSE
 * market.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./football-forecast-verification";

describe("football forecast verification (arXiv:2106.14345v2)", () => {
  const fs = [
    { pHome: 0.6, pDraw: 0.25, pAway: 0.15, outcome: 0 },
    { pHome: 0.3, pDraw: 0.3, pAway: 0.4, outcome: 2 },
    { pHome: 0.5, pDraw: 0.3, pAway: 0.2, outcome: 0 },
    { pHome: 0.2, pDraw: 0.3, pAway: 0.5, outcome: 1 },
  ];
  it("RPS perfect = 0", () => {
    expect(mod.rps({ pHome: 1, pDraw: 0, pAway: 0, outcome: 0 })).toBeCloseTo(0, 10);
    expect(mod.rps({ pHome: 1, pDraw: 0, pAway: 0, outcome: 2 })).toBeGreaterThan(0);
    expect(mod.rps({ pHome: 0.5, pDraw: 0.5, pAway: 0.5, outcome: 0 } as never)).toBeNull();
  });
  it("ignorance", () => {
    expect(mod.ignorance({ pHome: 0.5, pDraw: 0.3, pAway: 0.2, outcome: 0 })).toBeCloseTo(-Math.log(0.5), 10);
    expect(mod.ignorance({ pHome: 0, pDraw: 0.5, pAway: 0.5, outcome: 0 })).toBeNull();
  });
  it("reliability by outcome", () => {
    const r = mod.reliabilityByOutcome(fs, 2);
    expect(r).toHaveLength(3);
    expect(r[0]!.bins.reduce((s, b) => s + b.n, 0)).toBe(fs.length);
  });
  it("discrimination positive for a decent model", () => {
    const d = mod.discrimination(fs, 0)!;
    expect(d.diff).toBeGreaterThan(0);
    expect(mod.discrimination([], 0)).toBeNull();
  });
  it("isTernaryForecast rejects malformed", () => {
    expect(mod.isTernaryForecast({ pHome: 0.5, pDraw: 0.5, pAway: 0.5, outcome: 0 })).toBe(false);
  });
});
