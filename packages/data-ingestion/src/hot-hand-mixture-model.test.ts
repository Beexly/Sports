/**
 * Tests for ./hot-hand-mixture-model (arXiv:1906.03339, lane=tracking).
 *
 * ACCEPTANCE GATE: ADOPT if rho(scraped/computed CPAE, official NGS CPAE) >= 0.80 on a full season (2017 and/or
 * 2018) AND median coordinate deviation <= 2.0 yards on any linked tracking sample.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./hot-hand-mixture-model";

describe("hot-hand mixture model (arXiv:1806.06988v2)", () => {
  const hmm = { pCold: 0.3, pHot: 0.7, aCC: 0.8, aCH: 0.2, aHC: 0.2, aHH: 0.8 };
  it("hot streak -> high posterior hot prob", () => {
    const p = mod.posteriorHotProb([1, 1, 1, 1, 1, 1], hmm)!;
    expect(p).toBeGreaterThan(0.8);
    const c = mod.posteriorHotProb([0, 0, 0, 0, 0, 0], hmm)!;
    expect(c).toBeLessThan(0.2);
  });
  it("LR non-negative on streaky data", () => {
    const { lr } = mod.hotHandLR([1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0], hmm)!;
    expect(lr).toBeGreaterThanOrEqual(0);
  });
  it("null on malformed", () => {
    expect(mod.hmmLogLik([], 0.3, 0.7, 0.8, 0.2, 0.2, 0.8)).toBeNull();
    expect(mod.hmmLogLik([1], 0.3, 0.7, 0.5, 0.2, 0.2, 0.8)).toBeNull();
    expect(mod.bernoulliLogLik([1], 1)).toBeNull();
    expect(mod.posteriorHotProb([2] as never, hmm)).toBeNull();
  });
});
