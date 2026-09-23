/**
 * Vitest suite for arXiv:2501.18606v1 (Temporal Dynamics of Goal Scoring in Soccer).
 * Gate: Adopt if the same-team burstiness effect survives team-strength conditioning — i.e., observed same-team next-score rate in the first 5 minutes after a score exceeds the conditioned null by ≥ 15% relative with χ² p < 0.01 — AND the burstiness-adjusted live intensity improves 2025 second-half total log-loss by ≥ 0.01 nats over the base Poisson model.
 */
import { describe, it, expect } from "vitest";
import { burstIntensity, burstinessGateTest } from "./2501-18606v1-temporal-dynamics-of-goal-scoring";

describe("2501-18606v1 score-differential burstiness", () => {
  const p = { baseRate: 0.1, burstGain: 1.5, burstDecay: 0.5, trailingBoost: 0.3 };
  it("bursts right after a score and decays with time", () => {
    const fresh = burstIntensity(p, 0.5, 0, 30);
    const stale = burstIntensity(p, 30, 0, 30);
    expect(fresh).toBeGreaterThan(stale);
    expect(stale).toBeCloseTo(0.1, 6);
  });
  it("adds the trailing interaction only when behind", () => {
    expect(burstIntensity(p, 10, -7, 30)).toBeGreaterThan(burstIntensity(p, 10, 7, 30));
  });
  it("gate test requires >=15% excess over the conditioned null", () => {
    expect(burstinessGateTest(0.12, 0.1).passes).toBe(true);
    expect(burstinessGateTest(0.11, 0.1).passes).toBe(false);
    expect(() => burstinessGateTest(0.1, 0)).toThrow();
  });
  it("returns zero intensity when no time remains", () => {
    expect(burstIntensity(p, 0.5, -7, 0)).toBe(0);
  });
});
