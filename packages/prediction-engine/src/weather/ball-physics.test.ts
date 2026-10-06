/**
 * Cold-weather ball physics — tests (arXiv 2202.03034).
 *
 * ACCEPTANCE GATE: pressure falls with temperature by the gas law
 * (regulation anchor at 70F); epsilon drops in the cold; the effects
 * table pushes touchbacks down and fumbles up; lambda fitting recovers a
 * known parameter; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  ballEffects,
  fitLambda,
  pressureAtTemp,
  pressureDrop,
  restitutionAtTemp,
} from "./ball-physics";

describe("pressureAtTemp + pressureDrop", () => {
  it("anchors at 13 psi / 70F and drops in the cold", () => {
    expect(pressureAtTemp(70)).toBeCloseTo(13, 10);
    expect(pressureDrop(70)).toBeCloseTo(0, 10);
    // Ideal gas law: 13 * (460+32)/(460+70) at 32F.
    const p32 = pressureAtTemp(32);
    expect(p32).toBeCloseTo(13 * (491.67 / 529.67), 6);
    expect(p32).toBeLessThan(12.5); // below regulation: the Deflategate zone
    expect(pressureDrop(32)).toBeGreaterThan(0.9);
    expect(pressureDrop(32)).toBeLessThan(1);
    expect(() => pressureAtTemp(32, 0)).toThrow();
  });
});

describe("restitutionAtTemp + ballEffects", () => {
  it("deadens the ball in the cold", () => {
    const warm = restitutionAtTemp(70);
    const cold = restitutionAtTemp(10);
    expect(warm).toBeCloseTo(0.82, 12);
    expect(cold).toBeLessThan(warm);
    const fx = ballEffects(10);
    expect(fx.deltaEpsilon).toBeLessThan(0);
    expect(fx.touchbackFactor).toBeLessThan(1);
    expect(fx.fumblePp).toBeGreaterThan(0);
    const fxWarm = ballEffects(70);
    expect(fxWarm.touchbackFactor).toBeCloseTo(1, 12);
    expect(fxWarm.fumblePp).toBe(0);
    expect(() => restitutionAtTemp(32, 1.5)).toThrow();
    expect(() => restitutionAtTemp(32, 0.8, -0.1)).toThrow();
  });
});

describe("fitLambda", () => {
  it("recovers the epsilon-loss rate from paired games", () => {
    const temps = [10, 15, 20, 25, 28, 30];
    const pairs = temps.map((t) => ({
      tempF: t,
      epsilonObserved: restitutionAtTemp(t, 0.82, 0.012),
    }));
    expect(fitLambda(pairs)).toBeCloseTo(0.012, 6);
    expect(() => fitLambda([])).toThrow();
    expect(() => fitLambda([{ tempF: 70, epsilonObserved: 0.82 }])).toThrow();
  });
});
