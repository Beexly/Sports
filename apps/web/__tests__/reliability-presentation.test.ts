import { describe, it, expect } from "vitest";
import {
  buildReliabilityPresentation,
  consistencyBand,
  wilsonInterval,
  sampleGate,
  BASELINE_BRIER,
  type ReliabilitySample,
} from "@/lib/calibration/reliability-presentation";

/** Build n samples at a fixed predicted probability with a given win count. */
function samplesAt(probability: number, n: number, wins: number): ReliabilitySample[] {
  return Array.from({ length: n }, (_, i) => ({
    probability,
    outcome: (i < wins ? 1 : 0) as 0 | 1,
  }));
}

describe("reliability-presentation — sample gate (honesty floor)", () => {
  it("classifies by the research thresholds", () => {
    expect(sampleGate(0)).toBe("building");
    expect(sampleGate(99)).toBe("building");
    expect(sampleGate(100)).toBe("early");
    expect(sampleGate(250)).toBe("developing");
    expect(sampleGate(500)).toBe("credible");
    expect(sampleGate(5000)).toBe("credible");
  });

  it("is NOT display-ready below 100 settled picks and says 'building the record'", () => {
    const p = buildReliabilityPresentation(samplesAt(0.6, 40, 24));
    expect(p.displayReady).toBe(false);
    expect(p.gate).toBe("building");
    expect(p.verdictLine).toMatch(/building the record/i);
    expect(p.verdictLine).toContain("40 of 100");
  });

  it("never fabricates on an empty sample", () => {
    const p = buildReliabilityPresentation([]);
    expect(p.sampleSize).toBe(0);
    expect(p.hitRate).toBeNull();
    expect(p.displayReady).toBe(false);
    expect(p.withinBandShare).toBe(0);
  });
});

describe("reliability-presentation — consistency bands", () => {
  it("a band is wider for a smaller sample (noise honesty)", () => {
    const small = consistencyBand(0.7, 10);
    const large = consistencyBand(0.7, 1000);
    expect(small.hi - small.lo).toBeGreaterThan(large.hi - large.lo);
  });

  it("clamps to [0,1] and collapses to the point for n=0", () => {
    const zero = consistencyBand(0.5, 0);
    expect(zero.lo).toBe(0.5);
    expect(zero.hi).toBe(0.5);
    const edge = consistencyBand(0.98, 5);
    expect(edge.hi).toBeLessThanOrEqual(1);
    expect(edge.lo).toBeGreaterThanOrEqual(0);
  });
});

describe("reliability-presentation — Wilson interval", () => {
  it("brackets the point estimate and stays in [0,1]", () => {
    const w = wilsonInterval(60, 100);
    expect(w.point).toBeCloseTo(0.6, 5);
    expect(w.lo).toBeLessThan(0.6);
    expect(w.hi).toBeGreaterThan(0.6);
    expect(w.lo).toBeGreaterThanOrEqual(0);
    expect(w.hi).toBeLessThanOrEqual(1);
  });

  it("narrows as n grows", () => {
    const small = wilsonInterval(6, 10);
    const large = wilsonInterval(600, 1000);
    expect(small.hi - small.lo).toBeGreaterThan(large.hi - large.lo);
  });
});

describe("reliability-presentation — over/under-confidence labeling", () => {
  it("flags overconfidence when observed << predicted", () => {
    // 200 picks rated 70%, only 50% actually won → overconfident.
    const p = buildReliabilityPresentation(samplesAt(0.7, 200, 100));
    const bin = p.bins.find((b) => b.count > 0 && Math.round(b.predicted * 100) === 70);
    expect(bin?.verdict).toBe("overconfident");
    expect(bin?.withinBand).toBe(false);
    expect(bin?.observed).toBeLessThan(bin!.predicted);
  });

  it("flags underconfidence when observed >> predicted", () => {
    // 200 picks rated 55%, 90% won → underconfident.
    const p = buildReliabilityPresentation(samplesAt(0.55, 200, 180));
    const bin = p.bins.find((b) => b.count > 0 && Math.round(b.predicted * 100) === 55);
    expect(bin?.verdict).toBe("underconfident");
  });

  it("calls a well-calibrated bin consistent", () => {
    // 500 picks rated 60%, ~60% won → consistent.
    const p = buildReliabilityPresentation(samplesAt(0.6, 500, 300));
    const bin = p.bins.find((b) => b.count > 0 && Math.round(b.predicted * 100) === 60);
    expect(bin?.verdict).toBe("consistent");
    expect(bin?.withinBand).toBe(true);
  });

  it("renders the plain-language readout", () => {
    const p = buildReliabilityPresentation(samplesAt(0.7, 142, 100));
    const bin = p.bins.find((b) => b.count > 0);
    expect(bin?.readout).toMatch(/We rated 142 picks ~70%; they won \d+%\./);
  });
});

describe("reliability-presentation — Brier skill vs baseline", () => {
  it("is positive for a skilled (well-separated) model and uses the 0.25 baseline", () => {
    expect(BASELINE_BRIER).toBe(0.25);
    // Confident + correct: 90%-rated win 90%, 10%-rated win 10% → low Brier → positive skill.
    const skilled = [...samplesAt(0.9, 250, 225), ...samplesAt(0.1, 250, 25)];
    const p = buildReliabilityPresentation(skilled);
    expect(p.brierSkillVsBaseline).toBeGreaterThan(0);
    expect(p.brier).toBeLessThan(0.25);
  });

  it("is <= 0 for an always-50% (no-skill) model", () => {
    const coin = samplesAt(0.5, 400, 200);
    const p = buildReliabilityPresentation(coin);
    expect(p.brier).toBeCloseTo(0.25, 2);
    expect(p.brierSkillVsBaseline).toBeLessThanOrEqual(0.001);
  });
});

describe("reliability-presentation — overall shape", () => {
  it("reports hit-rate with a CI and a within-band share once ready", () => {
    const p = buildReliabilityPresentation(samplesAt(0.6, 500, 300));
    expect(p.displayReady).toBe(true);
    expect(p.gate).toBe("credible");
    expect(p.hitRate).not.toBeNull();
    expect(p.hitRate!.point).toBeCloseTo(0.6, 5);
    expect(p.withinBandShare).toBeGreaterThan(0);
    expect(p.withinBandShare).toBeLessThanOrEqual(1);
  });
});
