import { describe, it, expect } from "vitest";
import { runBrierOgdEnsemble } from "../brier-ogd-ensemble.js";
import { applyMmcTiebreak } from "../edge-lab/features/mmc-tiebreak.js";
import type { BrierOgdSample } from "../brier-ogd-ensemble.js";

/**
 * Fixture design note: the outcome stream must NOT alternate deterministically,
 * or every probability column shares one rank order and MMC honestly nulls
 * everything (verified while writing these tests). We draw y from a
 * low-discrepancy-ish jittered pattern and give the maverick a PRIVATE noise
 * term so its ranking genuinely diverges from the herd's on some rows.
 */
function buildSamples(n = 120): BrierOgdSample[] {
  const out: BrierOgdSample[] = [];
  let seed = 7;
  const rand = () => {
    seed = (seed * 48271) % (2**31);
    return seed / 2**31;
  };
  let i = 0;
  while (out.length < n) {
    const base = rand();
    // Skip some draws so parity between index and y breaks.
    if (rand() < 0.3) continue;
    const y: 0 | 1 = base < 0.55 ? 1 : 0;
    const herdP = y === 1 ? 0.7 : 0.35;
    const privateNoise = rand() < 0.25 ? (y === 1 ? -0.25 : 0.2) : 0;
    const mavP = Math.min(0.95, Math.max(0.05, herdP + privateNoise));
    out.push({
      sampleId: `s${i}`,
      members: { herdA: herdP, herdB: herdP, maverick: mavP },
      y,
      t: out.length,
    });
    i++;
  }
  return out;
}

describe("applyMmcTiebreak", () => {
  it("strength 0 returns weights unchanged (exact identity)", () => {
    const samples = buildSamples();
    const report = runBrierOgdEnsemble(samples);
    const r = applyMmcTiebreak(report.finalWeights, samples, { strength: 0 });
    expect(r.weights).toEqual(report.finalWeights);
    expect(r.adjustedModels).toEqual([]);
  });

  it("tilts toward members whose signal is unique vs the field", () => {
    const samples = buildSamples();
    const report = runBrierOgdEnsemble(samples);
    const before = report.finalWeights;
    const r = applyMmcTiebreak(before, samples, { strength: 0.5 });
    // herdA/herdB are interchangeable → identical post-tilt weight.
    expect(r.weights.herdA).toBeCloseTo(r.weights.herdB!, 12);
    // Still on the simplex.
    const sum = Object.values(r.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 9);
    expect(r.adjustedModels.length).toBeGreaterThan(0);
    // The tilt must actually move weights somewhere (non-degenerate fixture).
    const moved = Object.keys(before).some(
      (k) => Math.abs(before[k]! - r.weights[k]!) > 1e-9,
    );
    expect(moved).toBe(true);
  });

  it("short histories (<3 rows) return input weights with all-null MMC", () => {
    const w = { a: 0.5, b: 0.5 };
    const r = applyMmcTiebreak(w, [{ members: { a: 0.6, b: 0.6 }, y: 1 }]);
    expect(r.weights).toEqual(w);
    expect(r.mmcByModel).toEqual({ a: null, b: null });
  });

  it("incomplete member streams are excluded honestly, others still tilt", () => {
    const samples = buildSamples(40).map((s, i) =>
      i % 2 === 0
        ? s
        : { ...s, members: { herdA: s.members.herdA!, herdB: s.members.herdB! } },
    );
    const report = runBrierOgdEnsemble(samples);
    const r = applyMmcTiebreak(report.finalWeights, samples, { strength: 0.5 });
    expect(r.mmcByModel.maverick).toBeNull(); // missing every other row
    expect(r.adjustedModels).not.toContain("maverick");
  });

  it("fail closed on bad strength or empty inputs", () => {
    expect(() => applyMmcTiebreak({ a: 1 }, [], {})).toThrow();
    expect(() => applyMmcTiebreak({}, [{ members: {}, y: 1 }], {})).toThrow();
    expect(() =>
      applyMmcTiebreak({ a: 1 }, [{ members: { a: 0.5 }, y: 1 }], { strength: -1 }),
    ).toThrow();
    expect(() =>
      applyMmcTiebreak({ a: 1 }, [{ members: { a: 0.5 }, y: 1 }], { strength: Number.NaN }),
    ).toThrow();
  });

  it("end-to-end: OGD run + tilt stays on simplex", () => {
    const samples = buildSamples(80);
    const report = runBrierOgdEnsemble(samples);
    const r = applyMmcTiebreak(report.finalWeights, samples, { strength: 0.25 });
    for (const v of Object.values(r.weights)) {
      expect(v).toBeGreaterThanOrEqual(-1e-12);
      expect(v).toBeLessThanOrEqual(1 + 1e-12);
    }
  });
});
