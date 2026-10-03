import { describe, expect, it } from "vitest";
import {
  dawidSebastiani,
  fitChanceRates,
  logLambda,
  poissonLogLik,
} from "./block-poisson";
import type { BlockObs } from "./block-poisson";

let s = 43;
const rng = (): number => {
  s = (1664525 * s + 1013904223) >>> 0;
  return s / 4294967296;
};
// Poisson draws via Knuth with λ = exp(logLambda) under known params.
const truth = {
  offTheta: { A: 0.5, B: -0.5 },
  defTheta: { A: -0.3, B: 0.3 },
  homeGamma: 0.2,
  alpha: 0.01,
  beta: 0.1,
  baseRate: 1.2,
};
function rpois(lam: number): number {
  const L = Math.exp(-lam);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}
const obs: BlockObs[] = [];
for (let i = 0; i < 800; i++) {
  const home = rng() < 0.5;
  const o: BlockObs = {
    teamOff: home ? "A" : "B",
    teamDef: home ? "B" : "A",
    home,
    scoreDiff: Math.round((rng() - 0.5) * 20),
    chaos: rng() < 0.2 ? 1 : 0,
    chances: 0,
  };
  o.chances = rpois(Math.exp(logLambda(o, truth)));
  obs.push(o);
}

describe("block-poisson", () => {
  it("fitChanceRates recovers the home effect and team ordering", () => {
    const fit = fitChanceRates(obs, 0.1, 300);
    expect(fit.homeGamma).toBeGreaterThan(0);
    expect(fit.offTheta["A"]).toBeGreaterThan(fit.offTheta["B"] ?? 0);
    // sum-to-zero identifiability
    const sum = Object.values(fit.offTheta).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(0, 8);
  });

  it("fitted model beats the constant-rate baseline on Dawid–Sebastiani", () => {
    const fit = fitChanceRates(obs, 0.1, 300);
    const base = {
      offTheta: {},
      defTheta: {},
      homeGamma: 0,
      alpha: 0,
      beta: 0,
      baseRate: 1.2,
    };
    expect(dawidSebastiani(obs, fit)).toBeLessThan(dawidSebastiani(obs, base));
    expect(poissonLogLik(obs, fit)).toBeGreaterThan(poissonLogLik(obs, base));
    expect(dawidSebastiani([], fit)).toBeNaN();
  });

  it("logLambda is monotone in the chance drivers", () => {
    const o: BlockObs = { teamOff: "A", teamDef: "B", home: false, scoreDiff: 0, chaos: 0, chances: 1 };
    const p = { ...truth, offTheta: { ...truth.offTheta }, defTheta: { ...truth.defTheta } };
    expect(logLambda({ ...o, home: true }, p)).toBeGreaterThan(logLambda(o, p));
    expect(logLambda({ ...o, scoreDiff: 10 }, p)).toBeGreaterThan(logLambda(o, p));
  });
});
