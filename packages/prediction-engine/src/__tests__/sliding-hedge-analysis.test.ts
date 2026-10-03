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
    expect(["full", "window", "neither"]).toContain(m.expansionPreferred);
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
    expect(["ok", "warn_sitout_skill", "warn_toxic_middle", "insufficient_n"]).toContain(
      a.integrityStatus,
    );
    expect(a.priced).toBe(false);
    expect(a.status).toBe("shadow");
  });
});
