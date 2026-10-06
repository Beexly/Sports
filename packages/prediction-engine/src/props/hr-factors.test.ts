import { describe, expect, it } from "vitest";
import { HR_FACTOR_WEIGHTS, computeHrFactors } from "./hr-factors";
import type { HrFactorInputs } from "./hr-factors";

const leagueAvg: HrFactorInputs = {
  power: { barrelsPerPA: 0.065, hardHitPct: 0.38, sweetSpotPct: 0.33 },
  pitcher: { hrPer9: 1.15, flyBallPct: 0.36, pitcherThrows: "R", platoonAdvantage: false },
  context: { parkFactor: 1.0, windOutMph: 0, tempF: 72, lineupSlot: 5 },
};

describe("hr-factors", () => {
  it("league-average inputs produce a mid-range tilt with contributions summing to tilt", () => {
    const out = computeHrFactors(leagueAvg);
    expect(out.tilt).toBeGreaterThan(0.35);
    expect(out.tilt).toBeLessThan(0.65);
    const sum = Object.values(out.contributions).reduce((s, c) => s + c, 0);
    expect(sum).toBeCloseTo(out.tilt, 10);
    const wSum = Object.values(HR_FACTOR_WEIGHTS).reduce((s, w) => s + w, 0);
    expect(wSum).toBeCloseTo(1, 10);
  });

  it("is monotone: elite power + vulnerable pitcher + bandbox + wind out >> weak profile", () => {
    const elite: HrFactorInputs = {
      power: { barrelsPerPA: 0.12, hardHitPct: 0.52, sweetSpotPct: 0.42 },
      pitcher: { hrPer9: 1.9, flyBallPct: 0.45, pitcherThrows: "L", platoonAdvantage: true },
      context: { parkFactor: 1.35, windOutMph: 15, tempF: 90, lineupSlot: 2 },
    };
    const weak: HrFactorInputs = {
      power: { barrelsPerPA: 0.03, hardHitPct: 0.28, sweetSpotPct: 0.25 },
      pitcher: { hrPer9: 0.6, flyBallPct: 0.28, pitcherThrows: "R", platoonAdvantage: false },
      context: { parkFactor: 0.75, windOutMph: -12, tempF: 55, lineupSlot: 9 },
    };
    const e = computeHrFactors(elite);
    const w = computeHrFactors(weak);
    expect(e.tilt).toBeGreaterThan(w.tilt + 0.25);
    expect(e.components.power).toBeGreaterThan(w.components.power);
    expect(e.components.pitcherVuln).toBeGreaterThan(w.components.pitcherVuln);
    expect(e.components.park).toBeGreaterThan(w.components.park);
  });

  it("clamps extreme inputs to [0,1] without NaN", () => {
    const out = computeHrFactors({
      power: { barrelsPerPA: 0.5, hardHitPct: 0.99, sweetSpotPct: 0.99 },
      pitcher: { hrPer9: 5, flyBallPct: 0.9, pitcherThrows: "R", platoonAdvantage: true },
      context: { parkFactor: 2.0, windOutMph: 60, tempF: 110, lineupSlot: 1 },
    });
    expect(out.tilt).toBeLessThanOrEqual(1);
    expect(Number.isFinite(out.tilt)).toBe(true);
    for (const c of Object.values(out.components)) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });

  it("platoon advantage raises pitcher vulnerability, all else equal", () => {
    const a = computeHrFactors(leagueAvg);
    const b = computeHrFactors({
      ...leagueAvg,
      pitcher: { ...leagueAvg.pitcher, platoonAdvantage: true },
    });
    expect(b.components.pitcherVuln).toBeGreaterThan(a.components.pitcherVuln);
    expect(b.tilt).toBeGreaterThan(a.tilt);
  });
});
