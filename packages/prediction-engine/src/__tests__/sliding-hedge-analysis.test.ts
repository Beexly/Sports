import { describe, expect, it } from "vitest";
import {
  runOnlineBetaSlidingWindow,
  analyzeSlidingWindowOgd,
} from "../online-beta-sliding-window.js";
import { analyzeAdaptiveDeltaHedge } from "../adaptive-delta-analysis.js";
import { expertLossAtDelta } from "../adaptive-delta-hedge.js";

function underconfidentSeries(n = 120) {
  return Array.from({ length: n }, (_, i) => {
    const latent = 0.15 + (i / (n - 1)) * 0.7;
    const raw = 0.5 + 0.25 * (latent - 0.5);
    const y = (latent > 0.5 ? (i % 4 !== 0 ? 1 : 0) : i % 4 === 0 ? 1 : 0) as 0 | 1;
    return { p: raw, y, sampleId: `s${i}`, t: i };
  });
}

describe("sliding-window Online Beta OGD", () => {
  it("runs on short series", () => {
    const samples = underconfidentSeries(40);
    const rep = runOnlineBetaSlidingWindow(samples, { window: 20 });
    expect(rep.n).toBeLessThanOrEqual(20);
    expect(rep.status).toBe("shadow");
    expect(rep.priced).toBe(false);
  });

  it("analyzes full vs window metrics", () => {
    const m = analyzeSlidingWindowOgd(underconfidentSeries(100), { window: 40 });
    expect(m.nFull).toBe(100);
    expect(m.nWindow).toBe(40);
    expect(Number.isFinite(m.deltaA)).toBe(true);
    // On this underconfident series the full-series fit does NOT beat raw
    // Brier, and the window fit — though it does — carries LOWER Var[cal P]
    // than the full fit, so neither branch of the preference rule fires.
    // (Listing all three domain values in a toContain() cannot fail.)
    expect(m.full.beatsRawBrier).toBe(false);
    expect(m.sliding.varCalP).toBeLessThan(m.full.varCalP);
    expect(m.expansionPreferred).toBe("neither");
    expect(m.operatorHint).toMatch(/Neither full nor window OGD clearly beats raw Brier/);
    expect(m.status).toBe("shadow");
  });
});

describe("Hedge adaptive-δ analysis", () => {
  it("expert loss sanity", () => {
    const pub = expertLossAtDelta(0.7, 1, 0.1, 0.25);
    expect(pub.published).toBe(true);
    const sit = expertLossAtDelta(0.52, 0, 0.1, 0.25);
    expect(sit.published).toBe(false);
  });

  it("returns integrity + regret fields", () => {
    const samples = underconfidentSeries(80).map((s) => ({
      sampleId: s.sampleId,
      p: s.p,
      y: s.y,
      t: s.t,
    }));
    const a = analyzeAdaptiveDeltaHedge(samples);
    expect(a.report.n).toBe(80);
    expect(a.report.deltas).toContain(a.report.recommendedDelta);
    expect(Number.isFinite(a.weightOnRecommended)).toBe(true);
    expect(a.weightEntropyNorm).toBeGreaterThanOrEqual(0);
    expect(a.weightEntropyNorm).toBeLessThanOrEqual(1);
    // n=80 clears the n>=40 floor, so "insufficient_n" is ruled out, and this
    // underconfident series hides real skill in the sit-out region → the
    // analysis must raise the sit-out warning (not a bland "ok"). The previous
    // toContain() listed the entire 4-value domain and so could never fail.
    expect(a.report.n).toBeGreaterThanOrEqual(40);
    expect(a.integrityStatus).toBe("warn_sitout_skill");
    expect(a.operatorHint).toMatch(/Sit-out region has real skill/);
    expect(a.priced).toBe(false);
    expect(a.status).toBe("shadow");
  });
});
