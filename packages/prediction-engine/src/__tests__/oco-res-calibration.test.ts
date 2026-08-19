import { describe, expect, it } from "vitest";
import {
  applyOnlineBeta,
  runOnlineBetaRecalibration,
  fitResAwareBeta,
} from "../online-beta-recalibration.js";
import {
  expertLossAtDelta,
  runAdaptiveDeltaHedge,
} from "../adaptive-delta-hedge.js";
import {
  runOcoPipeline,
  runOcoPipelineFromSingleP,
} from "../oco-pipeline.js";

/** Underconfident raw p clustered near 0.5; true rate follows stretch of p. */
function underconfidentSeries(n = 120) {
  return Array.from({ length: n }, (_, i) => {
    const latent = 0.15 + (i / (n - 1)) * 0.7; // true-ish rate
    const raw = 0.5 + 0.25 * (latent - 0.5); // squeezed toward 0.5
    const y = (latent > 0.5 ? (i % 4 !== 0 ? 1 : 0) : i % 4 === 0 ? 1 : 0) as 0 | 1;
    return { p: raw, y, sampleId: `s${i}`, t: i };
  });
}

describe("online Beta recalibration", () => {
  it("applies identity at a=1,b=0", () => {
    expect(applyOnlineBeta(0.7, { a: 1, b: 0 })).toBeCloseTo(0.7, 5);
  });

  it("a>1 expands away from 0.5", () => {
    const raw = 0.55;
    const stretched = applyOnlineBeta(raw, { a: 2.5, b: 0 });
    expect(Math.abs(stretched - 0.5)).toBeGreaterThan(Math.abs(raw - 0.5));
  });

  it("runs online OGD without NaN", () => {
    const rep = runOnlineBetaRecalibration(underconfidentSeries(80));
    expect(rep.n).toBe(80);
    expect(Number.isFinite(rep.meanBrierOnline)).toBe(true);
    expect(rep.finalParams.a).toBeGreaterThan(0);
    expect(rep.status).toBe("shadow");
    expect(rep.priced).toBe(false);
  });
});

describe("RES-aware Beta", () => {
  it("fits with REL guard on underconfident data", () => {
    const rep = fitResAwareBeta(
      underconfidentSeries(100).map(({ p, y }) => ({ p, y })),
      { trainFrac: 0.7, maxRel: 0.05, lambdaA: 0.05, minTrainN: 30, minValN: 15 },
    );
    expect(rep.nTrain).toBeGreaterThan(0);
    expect(rep.nVal).toBeGreaterThan(0);
    // selected may or may not clear REL; if selected, a should be finite
    if (rep.selected && rep.params) {
      expect(Number.isFinite(rep.params.a)).toBe(true);
      expect(Number.isFinite(rep.valRes)).toBe(true);
    }
    expect(rep.status).toBe("shadow");
  });
});

describe("adaptive delta Hedge", () => {
  it("expert loss publishes vs sit-out", () => {
    const pub = expertLossAtDelta(0.7, 1, 0.1, 0.25);
    expect(pub.published).toBe(true);
    expect(pub.loss).toBeCloseTo(0.09, 6);
    const sit = expertLossAtDelta(0.52, 1, 0.1, 0.25);
    expect(sit.published).toBe(false);
    expect(sit.loss).toBe(0.25);
  });

  it("recommends a delta", () => {
    const samples = underconfidentSeries(100).map((s) => ({
      sampleId: s.sampleId,
      p: s.p,
      y: s.y,
      t: s.t,
    }));
    const rep = runAdaptiveDeltaHedge(samples);
    expect(rep.n).toBe(100);
    expect(rep.deltas).toContain(rep.recommendedDelta);
    expect(rep.finalWeights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    expect(rep.status).toBe("shadow");
  });
});

describe("OCO pipeline", () => {
  it("runs multi-member pipeline", () => {
    const samples = underconfidentSeries(60).map((s) => ({
      sampleId: s.sampleId,
      t: s.t,
      y: s.y,
      members: {
        raw: s.p,
        alt: Math.min(0.99, Math.max(0.01, s.p + 0.03 * ((s.t as number) % 3) - 0.03)),
      },
    }));
    const rep = runOcoPipeline(samples);
    expect(rep.n).toBe(60);
    expect(rep.finalBeta.a).toBeGreaterThan(0);
    expect(Number.isFinite(rep.meanBrierAllEns)).toBe(true);
    expect(rep.priced).toBe(false);
  });

  it("runs single-p convenience", () => {
    const rep = runOcoPipelineFromSingleP(underconfidentSeries(50));
    expect(rep.n).toBe(50);
    expect(rep.status).toBe("shadow");
  });
});
