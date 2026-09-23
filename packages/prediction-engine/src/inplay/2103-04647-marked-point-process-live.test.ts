import { describe, it, expect } from "vitest";
import {
  hawkesIntensity,
  hawkesLogLik,
  hawkesGridFit,
} from "./2103-04647-marked-point-process-live.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randn(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

describe("hawkes", () => {
  it("intensity jumps right after an event and decays", () => {
    const i0 = hawkesIntensity(1.0, [0.5], 0.5, 1.0, 2.0);
    const i1 = hawkesIntensity(0.4, [0.5], 0.5, 1.0, 2.0);
    expect(i0).toBeGreaterThan(i1);
    const iFar = hawkesIntensity(10, [0.5], 0.5, 1.0, 2.0);
    expect(iFar).toBeCloseTo(0.5, 3);
  });
  it("grid fit recovers self-excitation on clustered data", () => {
    const rand = mulberry32(161);
    // simulate a self-exciting process via thinning
    const T = 200;
    const events: number[] = [];
    let t = 0;
    const mu = 0.3;
    const alpha = 0.8;
    const beta = 1.5;
    while (t < T) {
      const m = mu + alpha * events.filter((e) => t - e < 5).length;
      t += -Math.log(1 - rand()) / Math.max(0.05, m);
      if (t >= T) break;
      const lam = hawkesIntensity(t, events, mu, alpha, beta);
      if (rand() < lam / Math.max(lam, m)) events.push(t);
    }
    const fit = hawkesGridFit(events, T, [0.1, 0.3, 0.5], [0.2, 0.8, 1.4], [0.8, 1.5, 2.5]);
    expect(fit.alpha).toBeGreaterThan(0.2); // excitation detected
    const llExcited = hawkesLogLik(events, T, fit.mu, fit.alpha, fit.beta);
    const llFlat = hawkesLogLik(events, T, events.length / T, 0.01, 1.5);
    expect(llExcited).toBeGreaterThan(llFlat);
  });
});
