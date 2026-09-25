import { describe, expect, it } from "vitest";
import {
  expectedCompletionAdapter,
  expectedYacAdapter,
  successRateAdapter,
  drivesAdapter,
  qbBurdenAdapter,
  receiverDifficultyAdapter,
  roleVolatilityAdapter,
  rushEnvironmentAdapter,
  marginMixtureAdapter,
  blockPoissonAdapter,
  eceAdapter,
  reliabilityDiagramAdapter,
  teamRatingAdapter,
  eloRatingAdapter,
  weatherImpactAdapter,
  altitudeFatigueAdapter,
  travelFatigueAdapter,
  injuryImpactAdapter,
  depthChartAdapter,
  fantasyProjectionAdapter,
  dfsValueAdapter,
  propEdgeAdapter,
  propLineValueAdapter,
  devigAdapter,
  lineMovementAdapter,
  consensusAdapter,
  EXTENDED_ADAPTERS,
} from "./extended-signal-adapters.js";
import { isObservation, isFailClosed } from "./universal-adapter.js";

describe("extended signal adapters — all modules wired", () => {
  it("all 26 extended adapters registered and callable", () => {
    expect(Object.keys(EXTENDED_ADAPTERS).length).toBe(26);
  });

  it("every adapter returns Observation or fail-closed on null", () => {
    for (const [name, fn] of Object.entries(EXTENDED_ADAPTERS)) {
      const r = (fn as (...args: unknown[]) => unknown)(null);
      expect(isObservation(r as never) || isFailClosed(r as never), `${name}`).toBe(true);
    }
  });

  it("every adapter with valid input returns Observation with real value", () => {
    const calls: Array<[string, () => unknown]> = [
      ["expectedCompletion", () => expectedCompletionAdapter(30, 20, 18)],
      ["expectedYac", () => expectedYacAdapter(5.2, 4.1)],
      ["successRate", () => successRateAdapter(35, 65)],
      ["drives", () => drivesAdapter(6.5, 32, 2.1)],
      ["qbBurden", () => qbBurdenAdapter(40, 65, 0.15)],
      ["receiverDifficulty", () => receiverDifficultyAdapter(0.25, 2.8, 4.5)],
      ["roleVolatility", () => roleVolatilityAdapter(0.05, 0.03)],
      ["rushEnvironment", () => rushEnvironmentAdapter(7, -0.05, 1.8)],
      ["marginMixture", () => marginMixtureAdapter(24, 17, 10, 12)],
      ["blockPoisson", () => blockPoissonAdapter(2.1, 1.5)],
      ["ece", () => eceAdapter([0.7, 0.3, 0.6], [1, 0, 1])],
      ["reliabilityDiagram", () => reliabilityDiagramAdapter(7, 50, 0.68)],
      ["teamRating", () => teamRatingAdapter(0.15, -0.05, 600)],
      ["eloRating", () => eloRatingAdapter(1550, 1500, 1)],
      ["weatherImpact", () => weatherImpactAdapter(45, 18, 30, true)],
      ["altitudeFatigue", () => altitudeFatigueAdapter(5280, 3, false)],
      ["travelFatigue", () => travelFatigueAdapter(2, 1500, 4)],
      ["injuryImpact", () => injuryImpactAdapter(5, 2, [-0.6, -0.3, 0])],
      ["depthChart", () => depthChartAdapter(0.85, 0.15, 2)],
      ["fantasyProjection", () => fantasyProjectionAdapter(18.5, 28, 8, 1)],
      ["dfsValue", () => dfsValueAdapter(22, 5500, 0.12)],
      ["propEdge", () => propEdgeAdapter(0.58, 0.52, 45)],
      ["propLineValue", () => propLineValueAdapter(6.5, 7.2, 1.5)],
      ["devig", () => devigAdapter(-110, -110)],
      ["lineMovement", () => lineMovementAdapter(-3, -3.5, 8)],
      ["consensus", () => consensusAdapter(-3.5, 0.5, 8)],
    ];
    for (const [name, fn] of calls) {
      const r = fn();
      expect(isObservation(r as never), `${name} should return Observation`).toBe(true);
      if (isObservation(r as never)) {
        expect((r as { value: unknown }).value, `${name} value`).not.toBeNull();
        expect((r as { provenance: string }).provenance, `${name} provenance`).toBeTruthy();
      }
    }
  });

  it("devig computes real fair probability", () => {
    const r = devigAdapter(-110, -110);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeCloseTo(0.5, 2);
    }
  });

  it("propEdge computes real edge", () => {
    const r = propEdgeAdapter(0.58, 0.52, 45);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeCloseTo(0.06, 4);
    }
  });

  it("ece computes real expected calibration error", () => {
    const r = eceAdapter([0.9, 0.8, 0.3, 0.2], [1, 1, 0, 0]);
    expect(isObservation(r)).toBe(true);
    if (isObservation(r)) {
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThanOrEqual(1);
    }
  });
});
