import { describe, expect, it } from "vitest";
import {
  evalVenueEnvironment,
  evalFahrenheitToKelvin,
  evalVenueEffect,
  evalBallPhysics,
  evalBallEffects,
  evalFitLambda,
  evalWeatherSource,
  evalSelectWeatherSource,
  evalShinFair,
  evalApplyBeta,
  evalMonotoneEnvelope,
  evalTailBlend,
  evalSafeLead,
  evalDiffusionWinProb,
  evalLeadSafetyFeature,
  evalExpectedLeadChanges,
} from "./physical-context-bridge.js";

describe("physical-context venue", () => {
  it("thinner air at altitude lowers the sea-level-equivalent kick difficulty", () => {
    const seaLevel = evalVenueEnvironment({
      nominalKickYards: 60,
      altitudeFeet: 0,
      tempF: 70,
    });
    const denver = evalVenueEnvironment({
      nominalKickYards: 60,
      altitudeFeet: 5280,
      tempF: 70,
    });
    expect(seaLevel.ok && denver.ok).toBe(true);
    if (seaLevel.ok && denver.ok) {
      expect(denver.data.airDensityKgM3).toBeLessThan(seaLevel.data.airDensityKgM3);
      expect(denver.data.kickDistanceScale).toBeGreaterThan(1);
      // effectiveKickDistance is the SEA-LEVEL-EQUIVALENT difficulty, so thin
      // air makes the same nominal kick worth fewer equivalent yards.
      expect(denver.data.effectiveKickYards).toBeLessThan(seaLevel.data.effectiveKickYards);
    }
  });

  it("hot thin air is less dense than cold dense air", () => {
    const cold = evalVenueEnvironment({ nominalKickYards: 55, altitudeFeet: 0, tempF: 20 });
    const hot = evalVenueEnvironment({ nominalKickYards: 55, altitudeFeet: 0, tempF: 100 });
    expect(cold.ok && hot.ok).toBe(true);
    if (cold.ok && hot.ok) {
      expect(hot.data.airDensityKgM3).toBeLessThan(cold.data.airDensityKgM3);
    }
  });

  it("fail-closes on non-physical and non-finite venue inputs", () => {
    expect(
      evalVenueEnvironment({ nominalKickYards: 0, altitudeFeet: 0, tempF: 70 }).ok,
    ).toBe(false);
    expect(
      evalVenueEnvironment({ nominalKickYards: 60, altitudeFeet: 0, tempF: Number.NaN }).ok,
    ).toBe(false);
    expect(
      evalVenueEnvironment({
        nominalKickYards: 60,
        altitudeFeet: 0,
        tempF: 70,
        pressureInHg: -3,
      }).ok,
    ).toBe(false);
    expect(
      evalVenueEnvironment({ nominalKickYards: 60, altitudeFeet: 0, tempF: -600 }).ok,
    ).toBe(false);
  });

  it("fahrenheitToKelvin converts freezing to 273.15", () => {
    const r = evalFahrenheitToKelvin({ tempF: 32 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.kelvin).toBeCloseTo(273.15, 6);
  });

  it("venue effect nets out the league-wide change", () => {
    const r = evalVenueEffect({
      venueBefore: 0.5,
      venueAfter: 0.6,
      leagueBefore: 0.5,
      leagueAfter: 0.55,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.effect).toBeCloseTo(0.05, 10);
  });
});

describe("physical-context ball", () => {
  it("cold air drops pressure and lowers restitution", () => {
    const cold = evalBallPhysics({ tempF: 20 });
    const regulation = evalBallPhysics({ tempF: 70 });
    expect(cold.ok && regulation.ok).toBe(true);
    if (cold.ok && regulation.ok) {
      expect(cold.data.dropPsi).toBeGreaterThan(regulation.data.dropPsi);
      expect(regulation.data.dropPsi).toBeCloseTo(0, 6);
      expect(cold.data.restitution).toBeLessThan(regulation.data.restitution);
    }
  });

  it("cold air raises fumble risk and pulls the touchback factor below regulation", () => {
    const cold = evalBallEffects({ tempF: 20 });
    const regulation = evalBallEffects({ tempF: 70 });
    expect(cold.ok && regulation.ok).toBe(true);
    if (cold.ok && regulation.ok) {
      expect(cold.data.fumblePp).toBeGreaterThan(regulation.data.fumblePp);
      expect(regulation.data.touchbackFactor).toBeCloseTo(1, 10);
      expect(cold.data.touchbackFactor).toBeLessThan(regulation.data.touchbackFactor);
    }
  });

  it("fitLambda recovers a positive slope from cold observations", () => {
    const r = evalFitLambda({
      pairs: [
        { tempF: 20, epsilonObserved: 0.78 },
        { tempF: 40, epsilonObserved: 0.8 },
        { tempF: 20, epsilonObserved: 0.77 },
      ],
      eps0: 0.82,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.lambda).toBeGreaterThan(0);
  });

  it("fail-closes on empty pairs and out-of-range anchors", () => {
    expect(evalFitLambda({ pairs: [] }).ok).toBe(false);
    expect(evalBallPhysics({ tempF: 70, eps0: 1.5 }).ok).toBe(false);
    expect(evalBallPhysics({ tempF: 70, lambda: -1 }).ok).toBe(false);
  });
});

describe("physical-context weather", () => {
  const good: { name: string; forecasts: number[]; actuals: number[] } = {
    name: "forecast-model",
    forecasts: [12, 4, 3, 15, 11, 2, 6, 14],
    actuals: [13, 3, 4, 14, 12, 3, 5, 15],
  };
  const useless: { name: string; forecasts: number[]; actuals: number[] } = {
    name: "constant",
    forecasts: [1, 1, 1, 1, 1, 1, 1, 1],
    actuals: [14, 2, 5, 13, 11, 4, 6, 15],
  };

  it("scores a source by decision value alongside the rmse baseline", () => {
    const r = evalWeatherSource({ source: good, threshold: 8 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.name).toBe("forecast-model");
      expect(r.data.decisionValue).toBeGreaterThan(0);
      expect(r.data.rmse).toBeGreaterThan(0);
    }
  });

  it("selects the source with the higher decision value", () => {
    const r = evalSelectWeatherSource({ sources: [useless, good], threshold: 8 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.name).toBe("forecast-model");
  });

  it("fail-closes on misaligned or empty series", () => {
    expect(
      evalWeatherSource({ source: { name: "x", forecasts: [1, 2], actuals: [1] }, threshold: 1 })
        .ok,
    ).toBe(false);
    expect(
      evalWeatherSource({ source: { name: "x", forecasts: [], actuals: [] }, threshold: 1 }).ok,
    ).toBe(false);
    expect(evalSelectWeatherSource({ sources: [], threshold: 1 }).ok).toBe(false);
  });
});

describe("physical-context shin fairness", () => {
  it("returns a fair probability inside [0, 1] for a normal two-way book", () => {
    const r = evalShinFair({ homeImplied: 0.55, awayImplied: 0.5, homeIsChosen: true });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.fair).toBeGreaterThan(0);
      expect(r.data.fair).toBeLessThan(1);
    }
  });

  it("fail-closes on a non-positive or non-finite book", () => {
    expect(evalShinFair({ homeImplied: 0, awayImplied: 0.5, homeIsChosen: true }).ok).toBe(false);
    expect(
      evalShinFair({ homeImplied: Number.NaN, awayImplied: 0.5, homeIsChosen: true }).ok,
    ).toBe(false);
  });
});

describe("physical-context calibration blend", () => {
  it("applies a beta map and keeps it inside (0, 1)", () => {
    const r = evalApplyBeta({ model: { a: 1, b: 1, c: 0 }, p: 0.6 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.calibrated).toBeGreaterThan(0);
      expect(r.data.calibrated).toBeLessThan(1);
    }
  });

  it("monotone envelope repairs a non-monotone map", () => {
    const wobbly = (x: number): number => (x < 0.5 ? x * 0.2 : (1 - x) * 0.2);
    const r = evalMonotoneEnvelope({ map: wobbly });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.monotone).toBe(true);
      expect(r.data.map(0.1)).toBeLessThanOrEqual(r.data.map(0.9) + 1e-9);
    }
  });

  it("reports a monotone tail blend when the maps agree", () => {
    const iso = (x: number): number => x;
    const beta = (x: number): number => x;
    const r = evalTailBlend({ iso, beta });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.monotone).toBe(true);
      expect(r.data.map(0.5)).toBeCloseTo(0.5, 6);
    }
  });

  it("fail-closes on non-function maps and an inverted tail band", () => {
    expect(
      evalTailBlend({
        iso: 7 as unknown as (p: number) => number,
        beta: (x: number) => x,
      }).ok,
    ).toBe(false);
    expect(
      evalTailBlend({
        iso: (x: number) => x,
        beta: (x: number) => x,
        tailLo: 0.9,
        tailHi: 0.1,
      }).ok,
    ).toBe(false);
    expect(
      evalApplyBeta({ model: { a: Number.NaN, b: 1, c: 0 }, p: 0.5 }).ok,
    ).toBe(false);
  });
});

describe("physical-context safe lead", () => {
  it("a big lead late is safer than a big lead early", () => {
    const late = evalSafeLead({
      lead: 14,
      timeRemainingMin: 5,
      driftPerMin: 0,
      diffusivity: 0.6,
    });
    const early = evalSafeLead({
      lead: 14,
      timeRemainingMin: 60,
      driftPerMin: 0,
      diffusivity: 0.6,
    });
    expect(late.ok && early.ok).toBe(true);
    if (late.ok && early.ok) {
      expect(late.data.survival).toBeGreaterThan(early.data.survival);
      expect(late.data.survival).toBeLessThanOrEqual(1);
    }
  });

  it("a trailing team is unsafe when time is short", () => {
    const r = evalSafeLead({
      lead: -10,
      timeRemainingMin: 1,
      driftPerMin: 0,
      diffusivity: 0.6,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.survival).toBeLessThan(0.5);
  });

  it("a held lead decays as time runs out, and a tied game is a coin flip", () => {
    const aheadLate = evalDiffusionWinProb({
      lead: 10,
      timeRemainingMin: 5,
      driftPerMin: 0,
      diffusivity: 0.6,
    });
    const aheadEarly = evalDiffusionWinProb({
      lead: 10,
      timeRemainingMin: 60,
      driftPerMin: 0,
      diffusivity: 0.6,
    });
    const tied = evalDiffusionWinProb({
      lead: 0,
      timeRemainingMin: 30,
      driftPerMin: 0,
      diffusivity: 0.6,
    });
    expect(aheadLate.ok && aheadEarly.ok && tied.ok).toBe(true);
    if (aheadLate.ok && aheadEarly.ok && tied.ok) {
      expect(aheadLate.data.winProb).toBeGreaterThan(aheadEarly.data.winProb);
      expect(tied.data.winProb).toBeCloseTo(0.5, 6);
    }
  });

  it("lead safety feature agrees with the spread direction", () => {
    const favorite = evalLeadSafetyFeature({
      lead: 7,
      timeRemainingMin: 20,
      pregameSpread: 7,
      diffusivity: 0.6,
    });
    const underdog = evalLeadSafetyFeature({
      lead: 7,
      timeRemainingMin: 20,
      pregameSpread: -7,
      diffusivity: 0.6,
    });
    expect(favorite.ok && underdog.ok).toBe(true);
    if (favorite.ok && underdog.ok) {
      expect(favorite.data.feature).toBeGreaterThan(underdog.data.feature);
    }
  });

  it("a big lead leaves fewer expected lead changes", () => {
    const bigLead = evalExpectedLeadChanges({
      lead: 20,
      timeRemainingMin: 60,
      eventsPerMin: 0.08,
      meanEventPoints: 6,
    });
    const tie = evalExpectedLeadChanges({
      lead: 0,
      timeRemainingMin: 60,
      eventsPerMin: 0.08,
      meanEventPoints: 6,
    });
    expect(bigLead.ok && tie.ok).toBe(true);
    if (bigLead.ok && tie.ok) {
      expect(tie.data.expectedChanges).toBeGreaterThan(bigLead.data.expectedChanges);
    }
  });

  it("fail-closes on zero diffusivity and bad event rates", () => {
    expect(
      evalSafeLead({ lead: 7, timeRemainingMin: 10, driftPerMin: 0, diffusivity: 0 }).ok,
    ).toBe(false);
    expect(
      evalDiffusionWinProb({ lead: 7, timeRemainingMin: 10, driftPerMin: 0, diffusivity: -1 })
        .ok,
    ).toBe(false);
    expect(
      evalExpectedLeadChanges({
        lead: 7,
        timeRemainingMin: 10,
        eventsPerMin: 0.1,
        meanEventPoints: 0,
      }).ok,
    ).toBe(false);
    expect(
      evalLeadSafetyFeature({
        lead: 7,
        timeRemainingMin: 10,
        pregameSpread: 3,
        diffusivity: 0,
      }).ok,
    ).toBe(false);
  });
});
