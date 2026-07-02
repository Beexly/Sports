import { describe, it, expect } from "vitest";
import {
  fitShrinkage,
  fitStratifiedShrinkage,
  type GroupObservation,
} from "@/lib/reconstruction/empirical-bayes";

/**
 * Stein-dominance property test — the HONEST version of the dump's
 * "sandbox: RMSE JS 1.106 vs MLE 1.898". Instead of quoting numbers from a
 * sandbox that never ran, this test GENERATES a known synthetic population,
 * adds sampling noise, and MEASURES both estimators against the known truth
 * on every CI run. If a future edit breaks the shrinkage math, this fails —
 * the falsification guard the dump gestured at, made executable.
 *
 * Deterministic LCG noise (no Math.random): reproducible by construction.
 */

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Approximate standard normal from 12 uniform draws (Irwin-Hall). */
function gauss(rng: () => number): number {
  let acc = 0;
  for (let i = 0; i < 12; i++) acc += rng();
  return acc - 6;
}

describe("Stein dominance (measured, never quoted)", () => {
  it("shrinkage beats raw MLE means in total squared error on a known population", () => {
    const rng = lcg(20260702);
    const TRUE_MEAN = 2.6; // population mean separation
    const TRUE_SPREAD = 0.5; // real between-player spread
    const NOISE_SD = 1.2; // per-target measurement noise

    // 80 players with known true abilities; each observed via a noisy,
    // small-sample weekly aggregate (3..12 targets).
    const truths = new Map<string, number>();
    const obs: GroupObservation[] = [];
    for (let i = 0; i < 80; i++) {
      const key = `p${i}`;
      const truth = TRUE_MEAN + TRUE_SPREAD * gauss(rng);
      truths.set(key, truth);
      const count = 3 + Math.floor(rng() * 10);
      // Observed mean = truth + noise scaled by 1/sqrt(count).
      const observed = truth + (NOISE_SD / Math.sqrt(count)) * gauss(rng);
      obs.push({ key, mean: observed, count });
    }

    const model = fitShrinkage(obs, NOISE_SD ** 2);
    let sseShrunk = 0;
    let sseRaw = 0;
    for (const o of obs) {
      const truth = truths.get(o.key)!;
      const est = model.estimates.get(o.key)!;
      sseShrunk += (est.shrunk - truth) ** 2;
      sseRaw += (o.mean - truth) ** 2;
    }
    // The Stein result, measured live: shrinkage must dominate the raw means.
    expect(sseShrunk).toBeLessThan(sseRaw);
    // And the margin should be material on small samples, not a rounding win.
    expect(sseShrunk / sseRaw).toBeLessThan(0.9);
  });

  it("stratified shrinkage beats global shrinkage when roles genuinely differ", () => {
    const rng = lcg(9257);
    const NOISE_SD = 1.0;
    const roles = [
      { name: "slot", mean: 3.1, spread: 0.25 },
      { name: "boundary", mean: 1.7, spread: 0.25 },
    ];
    const truths = new Map<string, number>();
    const obs: GroupObservation[] = [];
    for (const role of roles) {
      for (let i = 0; i < 30; i++) {
        const key = `${role.name}${i}`;
        const truth = role.mean + role.spread * gauss(rng);
        truths.set(key, truth);
        const count = 3 + Math.floor(rng() * 8);
        obs.push({ key, mean: truth + (NOISE_SD / Math.sqrt(count)) * gauss(rng), count });
      }
    }

    const global = fitShrinkage(obs, NOISE_SD ** 2);
    const strat = fitStratifiedShrinkage(obs, (o) => (o.key.startsWith("slot") ? "slot" : "boundary"), {
      minGroupsPerStratum: 10,
      withinVariance: NOISE_SD ** 2,
    });

    let sseGlobal = 0;
    let sseStrat = 0;
    for (const o of obs) {
      const truth = truths.get(o.key)!;
      sseGlobal += (global.estimates.get(o.key)!.shrunk - truth) ** 2;
      sseStrat += (strat.get(o.key)!.shrunk - truth) ** 2;
    }
    // Borrowing strength from the RIGHT peers must beat borrowing from the
    // washed-out league mean — measured, not the dump's asserted "+42%".
    expect(sseStrat).toBeLessThan(sseGlobal);
  });
});
