import { describe, it, expect } from "vitest";
import {
  TeamStrengthFilter,
  stableSigmoid,
  softplus,
  DEFAULT_PARTICLES,
  MAX_PARTICLES,
  MAX_STRENGTH_DIM,
  type StrengthUpdateReport,
} from "../team-strength-filter.js";

const A = 0;
const B = 1;

const mean = (xs: readonly number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length;

/**
 * Drive 60 synthetic games in which team A genuinely beats team B, alternating
 * the venue so the learned edge cannot be an artefact of `homeAdvantage`.
 * Returns P(A wins) for each game, taken from the PRE-update forecast.
 */
function runDominance(seed: number, games = 60): { filter: TeamStrengthFilter; pA: number[] } {
  const filter = new TeamStrengthFilter({ nTeams: 2, seed });
  const pA: number[] = [];
  for (let g = 0; g < games; g++) {
    const aIsHome = g % 2 === 0;
    filter.predictStates();
    const report = aIsHome ? filter.update(A, B, 1) : filter.update(B, A, 0);
    pA.push(aIsHome ? report.predictedHomeWinProb : 1 - report.predictedHomeWinProb);
  }
  return { filter, pA };
}

describe("stableSigmoid / softplus — numerical safety", () => {
  it("never overflows and never returns NaN for finite input", () => {
    for (const x of [-1e308, -800, -50, -1, 0, 1, 50, 800, 1e308]) {
      const p = stableSigmoid(x);
      expect(Number.isFinite(p)).toBe(true);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
      expect(Number.isFinite(softplus(x))).toBe(true);
    }
    // The naive 1/(1+exp(-x)) overflows exp() at x = -800 and yields 0/Infinity.
    expect(stableSigmoid(-800)).toBe(0);
    expect(stableSigmoid(800)).toBe(1);
    expect(stableSigmoid(0)).toBe(0.5);
    // The naive log(1+exp(x)) overflows at x = 800; the factored form does not.
    expect(softplus(800)).toBe(800);
    expect(softplus(0)).toBeCloseTo(Math.LN2, 12);
  });

  it("handles infinities without NaN and is symmetric", () => {
    expect(stableSigmoid(Number.POSITIVE_INFINITY)).toBe(1);
    expect(stableSigmoid(Number.NEGATIVE_INFINITY)).toBe(0);
    expect(softplus(Number.NEGATIVE_INFINITY)).toBe(0);
    expect(softplus(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
    expect(Number.isNaN(stableSigmoid(Number.NaN))).toBe(true);
    expect(Number.isNaN(softplus(Number.NaN))).toBe(true);
    for (const x of [-7.5, -0.3, 0.9, 4.2]) {
      expect(stableSigmoid(x) + stableSigmoid(-x)).toBeCloseTo(1, 12);
      // The identity the filter's likelihood relies on: log sigmoid(x) = −softplus(−x).
      expect(-softplus(-x)).toBeCloseTo(Math.log(stableSigmoid(x)), 12);
      expect(-softplus(x)).toBeCloseTo(Math.log(1 - stableSigmoid(x)), 12);
    }
  });
});

describe("prior — the untouched filter is symmetric and correctly scaled", () => {
  it("predicts sigmoid(homeAdvantage), attenuated by posterior spread", () => {
    // At t=0 every team is drawn from the same N(0, initialSd²) prior, so
    // E[y] = homeAdvantage = 0.2 and the mixture forecast should sit just under
    // sigmoid(0.2) = 0.54983 — Jensen pulls a mixture of sigmoids toward 0.5
    // because sigmoid is concave above the origin.
    // OBSERVED (seed 7): 0.5458138197485958.
    const f = new TeamStrengthFilter({ nTeams: 4, seed: 7 });
    const p = f.predictHomeWinProbability(0, 1);
    expect(p).toBeGreaterThan(0.5);
    expect(p).toBeLessThan(1 / (1 + Math.exp(-0.2))); // strictly attenuated
    expect(p).toBeCloseTo(0.5458, 3);
  });

  it("starts from the stationary prior variance of the AR(1) dynamics", () => {
    // Var[wᵀs] = dim · initialSd² with w = 1, and initialSd defaults to the
    // stationary sd processNoise/√(1−a²) = 0.02/√(1−0.98²) = 0.100504.
    // So the expected projection variance is 3 · 0.0101010 = 0.0303030.
    // OBSERVED (seed 7, N=1000): 0.028266. A sample variance from N=1000 draws
    // has relative sd √(2/N) = 4.5%, so 0.02827 is (0.0303−0.0283)/0.00136 ≈ 1.5 SE
    // low — ordinary Monte Carlo noise. Asserted with margin at ±25%.
    const f = new TeamStrengthFilter({ nTeams: 4, seed: 7 });
    const expected = 3 * (0.02 / Math.sqrt(1 - 0.98 ** 2)) ** 2;
    expect(f.initialSd).toBeCloseTo(0.100504, 6);
    const post = f.posteriorFor(0);
    expect(post.varianceStrength).toBeGreaterThan(expected * 0.75);
    expect(post.varianceStrength).toBeLessThan(expected * 1.25);
    expect(Math.abs(post.meanStrength)).toBeLessThan(0.05); // centred at zero
    expect(post.meanByDim).toHaveLength(3);
  });

  it("reports uniform weights and full ESS before any observation", () => {
    const f = new TeamStrengthFilter({ nTeams: 3, seed: 1, nParticles: 200 });
    const w = f.particleWeights();
    expect(w).toHaveLength(200);
    expect(w.every((x) => x === 1 / 200)).toBe(true);
    expect(f.effectiveSampleSize()).toBeCloseTo(200, 6);
    const d = f.diagnostics();
    expect(d.step).toBe(0);
    expect(d.observations).toBe(0);
    expect(d.resampleCount).toBe(0);
    expect(d.degenerateCount).toBe(0);
    expect(d.status).toBe("shadow");
    expect(d.priced).toBe(false);
  });
});

describe("the filter LEARNS — latent strength recovered from outcomes alone", () => {
  it("raises P(A beats B) well above 0.5 over ~60 games, on every seed tried", () => {
    // 60 games, A wins all of them, venue alternating so home advantage cannot
    // masquerade as team strength. Defaults throughout (nParticles=1000, a=0.98,
    // processNoise=0.02, sigma=1.0, homeAdvantage=0.2).
    //
    // OBSERVED across seeds [7, 42, 2026, 1, 555]:
    //   mean of first 10 forecasts : 0.5265 0.5286 0.5264 0.5311 0.5274
    //   mean of last  10 forecasts : 0.6374 0.6344 0.6302 0.6328 0.6504
    //   P(A beats B, A at home)    : 0.6911 0.6883 0.6833 0.6861 0.7080
    //   P(A beats B, A on the road) : 0.6010 0.5978 0.5921 0.5952 0.6204
    //
    // The road number is the strict test: it strips homeAdvantage entirely, so
    // anything above 0.5 there is learned team strength and nothing else. The
    // ceiling is set by the model itself, not by the data — with a = 0.98 the
    // stationary prior holds sd(wᵀs) = √3·0.1005 = 0.174 per team, so the
    // strength gap is a priori a ~0.25-sd quantity and the posterior physically
    // cannot sprint to 0.99. That is the point of a filter with a prior.
    for (const seed of [7, 42, 2026, 1, 555]) {
      const { filter, pA } = runDominance(seed);
      const first10 = mean(pA.slice(0, 10));
      const last10 = mean(pA.slice(-10));

      expect(last10).toBeGreaterThan(first10 + 0.07); // observed lift ≈ 0.105
      expect(last10).toBeGreaterThan(0.6); // observed 0.630–0.650
      // A at home, and — the strict form — A on the road.
      expect(filter.predictHomeWinProbability(A, B)).toBeGreaterThan(0.65);
      expect(1 - filter.predictHomeWinProbability(B, A)).toBeGreaterThan(0.55);
    }
  });

  it("puts A's posterior mean strength above B's, with a gap far larger than the noise", () => {
    // OBSERVED across the same seeds:
    //   meanA :  0.2541  0.2941  0.2853  0.2788  0.3881
    //   meanB : -0.3601 -0.3062 -0.2912 -0.3104 -0.3110
    //   gap   :  0.614   0.600   0.577   0.589   0.699
    // Posterior sd per team is √0.023 ≈ 0.152, so the gap runs ≈ 4 posterior sd
    // — not a coin-flip artefact. Asserted with margin at > 0.4.
    for (const seed of [7, 42, 2026, 1, 555]) {
      const { filter } = runDominance(seed);
      const a = filter.posteriorFor(A);
      const b = filter.posteriorFor(B);
      expect(a.meanStrength).toBeGreaterThan(b.meanStrength);
      expect(a.meanStrength - b.meanStrength).toBeGreaterThan(0.4);
      expect(a.meanStrength).toBeGreaterThan(0);
      expect(b.meanStrength).toBeLessThan(0);
      // Uncertainty survives learning — this is a posterior, not a point estimate.
      expect(a.varianceStrength).toBeGreaterThan(0);
      expect(Number.isFinite(a.varianceStrength)).toBe(true);
    }
  });

  it("beats the uninformative baseline on Brier over the whole sequence", () => {
    // Mean Brier of the out-of-sample forecasts vs the 0.25 a constant 0.5 scores.
    // OBSERVED: 0.1662 0.1677 0.1710 0.1629 0.1644 — a ~34% reduction, which is
    // exactly the RES (resolution) this module exists to produce.
    for (const seed of [7, 42, 2026, 1, 555]) {
      const { pA } = runDominance(seed);
      const brier = mean(pA.map((p) => (1 - p) ** 2)); // A always won
      expect(brier).toBeLessThan(0.2);
      expect(brier).toBeGreaterThan(0); // sanity: not a degenerate p=1 collapse
    }
  });

  it("NULL CONTROL: an outcome sequence with no real edge leaves the teams level", () => {
    // Same machinery, alternating outcomes (A wins half at home, loses half).
    // OBSERVED gaps (meanA − meanB): −0.0515 −0.0580 −0.0463 — an order of
    // magnitude smaller than the ≈0.60 gap the genuine-edge sequence produces,
    // and slightly NEGATIVE because losing half your home games is mild evidence
    // against you once homeAdvantage is priced in. Without this control the
    // learning test above could be passing on drift rather than on signal.
    for (const seed of [7, 42, 2026]) {
      const f = new TeamStrengthFilter({ nTeams: 2, seed });
      for (let g = 0; g < 60; g++) {
        f.predictStates();
        f.update(A, B, g % 2);
      }
      const gap = f.posteriorFor(A).meanStrength - f.posteriorFor(B).meanStrength;
      expect(Math.abs(gap)).toBeLessThan(0.15);
    }
  });

  it("reports the PRE-update forecast, so scoring stays out-of-sample", () => {
    // The returned probability must be the one formed BEFORE the outcome touched
    // the weights. Proof: re-predicting the same matchup immediately after the
    // update moves toward the observed outcome, so the two cannot be equal.
    const f = new TeamStrengthFilter({ nTeams: 2, seed: 17, sigma: 0.2 });
    f.predictStates();
    const before = f.predictHomeWinProbability(A, B);
    const report = f.update(A, B, 1);
    const after = f.predictHomeWinProbability(A, B);
    expect(report.predictedHomeWinProb).toBeCloseTo(before, 12); // pre-update
    expect(after).toBeGreaterThan(report.predictedHomeWinProb); // posterior moved
    expect(report.brier).toBeCloseTo((before - 1) ** 2, 12);
    expect(report.logScore).toBeCloseTo(-Math.log(before), 12);
  });
});

/**
 * Independent re-derivation of the whole model from the spec in the module header,
 * sharing NO code with the implementation: its own mulberry32, its own Box–Muller,
 * its own dynamics, projection, likelihood and log-space normalisation, and a
 * plain number[] layout instead of a strided Float64Array.
 *
 * This is the test that actually pins the arithmetic. A sign flip in the
 * likelihood, a swapped home/away, an off-by-one in the (p·nTeams + t)·dim
 * stride, a drift written to the wrong team, or a change in how many normals a
 * step consumes all break it — none of which the aggregate "does it learn?"
 * assertions can localise.
 */
function referenceFilter(cfg: {
  nTeams: number;
  dim: number;
  nParticles: number;
  seed: number;
  a: number;
  processNoise: number;
  sigma: number;
  homeAdvantage: number;
  initialSd: number;
}) {
  const { nTeams, dim, nParticles, a, processNoise, sigma, homeAdvantage, initialSd } = cfg;

  let rngState = cfg.seed >>> 0;
  const rand = (): number => {
    rngState |= 0;
    rngState = (rngState + 0x6d2b79f5) | 0;
    let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let spare: number | null = null;
  const normal = (): number => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    const u1 = Math.max(rand(), Number.EPSILON);
    const u2 = rand();
    const radius = Math.sqrt(-2 * Math.log(u1));
    const theta = 2 * Math.PI * u2;
    spare = radius * Math.sin(theta);
    return radius * Math.cos(theta);
  };
  const softplusRef = (x: number): number =>
    x > 0 ? x + Math.log1p(Math.exp(-x)) : Math.log1p(Math.exp(x));
  const sigmoidRef = (x: number): number =>
    x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x));

  // states[particle][team][dim] — deliberately a different memory layout.
  const states: number[][][] = [];
  for (let p = 0; p < nParticles; p++) {
    const perTeam: number[][] = [];
    for (let t = 0; t < nTeams; t++) {
      const perDim: number[] = [];
      for (let d = 0; d < dim; d++) perDim.push(initialSd * normal());
      perTeam.push(perDim);
    }
    states.push(perTeam);
  }
  const logW = new Array<number>(nParticles).fill(0);

  const proj = (p: number, team: number): number => {
    let acc = 0;
    for (let d = 0; d < dim; d++) acc += states[p]![team]![d]!;
    return acc; // w = all ones
  };
  const normalised = (): number[] => {
    let max = Number.NEGATIVE_INFINITY;
    for (const v of logW) if (v > max) max = v;
    const w = logW.map((v) => Math.exp(v - max));
    const sum = w.reduce((s, x) => s + x, 0);
    return w.map((x) => x / sum);
  };

  return {
    predictStates(drift?: ReadonlyMap<number, number>): void {
      for (let p = 0; p < nParticles; p++)
        for (let t = 0; t < nTeams; t++)
          for (let d = 0; d < dim; d++) {
            const eta = normal(); // drawn unconditionally, as the module documents
            states[p]![t]![d] = a * states[p]![t]![d]! + (drift?.get(t) ?? 0) + processNoise * eta;
          }
    },
    update(home: number, away: number, outcome: 0 | 1): number {
      const w = normalised();
      let forecast = 0;
      for (let p = 0; p < nParticles; p++) {
        forecast += w[p]! * sigmoidRef((proj(p, home) - proj(p, away) + homeAdvantage) / sigma);
      }
      for (let p = 0; p < nParticles; p++) {
        const y = (proj(p, home) - proj(p, away) + homeAdvantage) / sigma;
        logW[p] = logW[p]! + (outcome === 1 ? -softplusRef(-y) : -softplusRef(y));
      }
      return forecast;
    },
    meanStrength(team: number): number {
      const w = normalised();
      let m = 0;
      for (let p = 0; p < nParticles; p++) m += w[p]! * proj(p, team);
      return m;
    },
    ess(): number {
      return 1 / normalised().reduce((s, x) => s + x * x, 0);
    },
  };
}

describe("cross-check against an independent re-derivation of the model", () => {
  it("reproduces forecasts, posterior means and ESS to machine precision", () => {
    const cfg = {
      nTeams: 3,
      dim: 2,
      nParticles: 128,
      seed: 4242,
      a: 0.9,
      processNoise: 0.05,
      sigma: 0.7,
      homeAdvantage: 0.15,
    };
    const initialSd = cfg.processNoise / Math.sqrt(1 - cfg.a ** 2);
    const filter = new TeamStrengthFilter({ ...cfg, essThreshold: 1e-12 }); // never resample
    const ref = referenceFilter({ ...cfg, initialSd });
    expect(filter.initialSd).toBeCloseTo(initialSd, 15);

    // Asymmetric schedule: every team appears at home and away, outcomes mixed,
    // and one step carries a drift so the intervention path is covered too.
    const schedule: ReadonlyArray<readonly [number, number, 0 | 1]> = [
      [0, 1, 1],
      [1, 2, 0],
      [2, 0, 1],
      [0, 2, 0],
      [1, 0, 1],
      [2, 1, 1],
    ];
    for (let k = 0; k < schedule.length; k++) {
      const [home, away, outcome] = schedule[k]!;
      const shocked = k === 2;
      filter.predictStates(shocked ? [{ team: 1, delta: -0.04 }] : undefined);
      ref.predictStates(shocked ? new Map([[1, -0.04]]) : undefined);
      const expected = ref.update(home, away, outcome);
      const actual = filter.update(home, away, outcome).predictedHomeWinProb;
      expect(actual).toBeCloseTo(expected, 14);
    }
    for (let t = 0; t < cfg.nTeams; t++) {
      expect(filter.posteriorFor(t).meanStrength).toBeCloseTo(ref.meanStrength(t), 13);
    }
    expect(filter.effectiveSampleSize()).toBeCloseTo(ref.ess(), 9);
    expect(filter.diagnostics().resampleCount).toBe(0); // the reference has no resampler
  });

  it("SIGN SENTINEL: the forecast is antisymmetric in home/away once homeAdvantage is 0", () => {
    // P(x beats y at home) + P(y beats x at home) must be exactly 1 when there is
    // no home term, because the two logits are exact negatives. This is the
    // cheapest possible detector for a swapped home/away or a flipped projection
    // sign, and it holds after the posterior has been moved by real observations.
    const f = new TeamStrengthFilter({ nTeams: 3, seed: 55, homeAdvantage: 0 });
    for (let g = 0; g < 12; g++) {
      f.predictStates();
      f.update(0, 1, g % 2 === 0 ? 1 : 0);
    }
    expect(f.predictHomeWinProbability(0, 1) + f.predictHomeWinProbability(1, 0)).toBeCloseTo(1, 12);
    expect(f.predictHomeWinProbability(0, 2) + f.predictHomeWinProbability(2, 0)).toBeCloseTo(1, 12);

    // With a positive home term the SAME pair must instead sum to strictly above 1
    // — otherwise homeAdvantage is being applied to the wrong side, or not at all.
    const h = new TeamStrengthFilter({ nTeams: 3, seed: 55, homeAdvantage: 0.4 });
    const sum = h.predictHomeWinProbability(0, 1) + h.predictHomeWinProbability(1, 0);
    expect(sum).toBeGreaterThan(1.05);
    expect(h.predictHomeWinProbability(0, 1)).toBeGreaterThan(
      new TeamStrengthFilter({ nTeams: 3, seed: 55, homeAdvantage: 0 }).predictHomeWinProbability(0, 1),
    );
  });
});

describe("determinism under a fixed seed (house law)", () => {
  function trajectory(seed: number, probeReadOnly: boolean): StrengthUpdateReport[] {
    const f = new TeamStrengthFilter({ nTeams: 3, seed });
    const out: StrengthUpdateReport[] = [];
    for (let g = 0; g < 20; g++) {
      f.predictStates(g % 4 === 0 ? [{ team: 1, delta: -0.03 }] : undefined);
      if (probeReadOnly) {
        f.diagnostics();
        f.posterior();
        f.particleWeights();
        f.effectiveSampleSize();
        f.predictHomeWinProbability(0, 2);
      }
      out.push(f.update(g % 3, (g + 1) % 3, g % 2));
    }
    return out;
  }

  it("same seed + same call sequence reproduces the trajectory exactly", () => {
    expect(trajectory(42, false)).toEqual(trajectory(42, false));
  });

  it("read-only methods do not consume randomness or perturb the run", () => {
    // diagnostics/posterior/particleWeights/predictHomeWinProbability must be
    // pure. If any of them touched the PRNG, the interleaved run would diverge.
    expect(trajectory(42, true)).toEqual(trajectory(42, false));
  });

  it("different seeds diverge", () => {
    expect(trajectory(43, false)).not.toEqual(trajectory(42, false));
  });

  it("two filters constructed with the same seed start from the identical cloud", () => {
    const x = new TeamStrengthFilter({ nTeams: 5, seed: 2026, nParticles: 64 });
    const y = new TeamStrengthFilter({ nTeams: 5, seed: 2026, nParticles: 64 });
    expect(x.posterior()).toEqual(y.posterior());
    const z = new TeamStrengthFilter({ nTeams: 5, seed: 2027, nParticles: 64 });
    expect(z.posterior()).not.toEqual(x.posterior());
  });
});

describe("ESS and resampling", () => {
  it("resamples exactly when ESS falls below nParticles × essThreshold", () => {
    // essThreshold = 1 makes the condition ESS < N true on every update (ESS is
    // at most N, and strictly below it whenever any two weights differ).
    const always = new TeamStrengthFilter({ nTeams: 2, seed: 8, essThreshold: 1 });
    for (let g = 0; g < 6; g++) {
      always.predictStates();
      expect(always.update(A, B, 1).resampled).toBe(true);
    }
    expect(always.diagnostics().resampleCount).toBe(6);

    // A threshold at the floor never fires.
    const never = new TeamStrengthFilter({ nTeams: 2, seed: 8, essThreshold: 1e-9 });
    for (let g = 0; g < 6; g++) {
      never.predictStates();
      expect(never.update(A, B, 1).resampled).toBe(false);
    }
    expect(never.diagnostics().resampleCount).toBe(0);
  });

  it("resampling preserves the particle count exactly and resets weights to uniform", () => {
    // The two classic bugs live here: losing/duplicating a particle when the
    // cumulative weights finish a few ULPs under 1.0, and aliasing the buffer.
    for (const resampling of ["systematic", "multinomial"] as const) {
      for (const nParticles of [1, 2, 257, 1000]) {
        const f = new TeamStrengthFilter({
          nTeams: 2,
          seed: 4,
          sigma: 0.05,
          essThreshold: 1,
          nParticles,
          resampling,
        });
        f.predictStates();
        f.update(A, B, 1);
        const w = f.particleWeights();
        expect(w).toHaveLength(nParticles); // count preserved EXACTLY
        expect(w.every((x) => x === w[0])).toBe(true); // reset to uniform
        expect(w[0]).toBe(1 / nParticles);
        expect(mean(w) * nParticles).toBeCloseTo(1, 12);
        expect(f.effectiveSampleSize()).toBeCloseTo(nParticles, 6);
        expect(f.diagnostics().nParticles).toBe(nParticles);
      }
    }
  });

  it("resampling is approximately mean-preserving (it must not move the posterior)", () => {
    // Two filters, identical seed and cloud; one resamples, one does not.
    // The resampled cloud is an unbiased redraw, so its mean must track the
    // weighted mean to within Monte Carlo error.
    // OBSERVED: weighted mean 0.047381; resampled 0.044675 (systematic),
    // 0.045668 (multinomial). Posterior sd ≈ √0.0269 = 0.164, so the MC standard
    // error at N=1000 is 0.164/√1000 = 0.0052 — both gaps are inside 1 SE.
    for (const resampling of ["systematic", "multinomial"] as const) {
      const held = new TeamStrengthFilter({ nTeams: 2, seed: 31, sigma: 0.1, essThreshold: 1e-9, resampling });
      const drawn = new TeamStrengthFilter({ nTeams: 2, seed: 31, sigma: 0.1, essThreshold: 1, resampling });
      held.predictStates();
      drawn.predictStates();
      held.update(A, B, 1);
      drawn.update(A, B, 1);
      const weighted = held.posteriorFor(A).meanStrength;
      const resampled = drawn.posteriorFor(A).meanStrength;
      expect(Math.abs(resampled - weighted)).toBeLessThan(0.02); // ≈ 4 MC SE
      expect(drawn.diagnostics().resampleCount).toBe(1);
      expect(held.diagnostics().resampleCount).toBe(0);

      // …and it must genuinely SELECT BY WEIGHT, not merely permute. An identity
      // permutation (the multinomial degenerate fallback, or a systematic loop
      // that never advances `i`) would also preserve the count and reset the
      // weights to uniform, passing every other assertion above. It would leave
      // the UNWEIGHTED cloud mean behind instead, which sits far outside the MC
      // band: 0.00393 vs the weighted 0.04738 — a 0.0434 gap against a 0.02
      // tolerance. Pinning that distance is what makes this test load-bearing.
      const untouched = new TeamStrengthFilter({ nTeams: 2, seed: 31, sigma: 0.1, essThreshold: 1e-9, resampling });
      untouched.predictStates();
      const unweighted = untouched.posteriorFor(A).meanStrength; // weights still uniform
      expect(Math.abs(weighted - unweighted)).toBeGreaterThan(0.03);
      expect(Math.abs(resampled - unweighted)).toBeGreaterThan(0.03);
    }
  });

  it("a sharper likelihood degrades ESS faster and triggers more resamples", () => {
    // Smaller sigma ⇒ more decisive likelihood ⇒ weights concentrate ⇒ ESS falls.
    // OBSERVED over 40 games, 6 teams, seed 11:
    //   sigma=1.00 → 2 resamples, min ESS-after 466.9
    //   sigma=0.20 → 5 resamples, min ESS-after 414.3
    //   sigma=0.05 → 7 resamples, min ESS-after 303.0
    const counts: number[] = [];
    const minEss: number[] = [];
    for (const sigma of [1.0, 0.2, 0.05]) {
      const f = new TeamStrengthFilter({ nTeams: 6, seed: 11, sigma });
      let lowest = Number.POSITIVE_INFINITY;
      for (let g = 0; g < 40; g++) {
        f.predictStates();
        const r = f.update(g % 6, (g + 1) % 6, g % 2);
        lowest = Math.min(lowest, r.essAfter);
        expect(r.essAfter).toBeGreaterThan(0);
        expect(r.essAfter).toBeLessThanOrEqual(f.diagnostics().nParticles + 1e-6);
      }
      counts.push(f.diagnostics().resampleCount);
      minEss.push(lowest);
    }
    expect(counts[0]!).toBeLessThan(counts[1]!);
    expect(counts[1]!).toBeLessThan(counts[2]!);
    expect(minEss[0]!).toBeGreaterThan(minEss[2]!);
  });

  it("nParticles = 1 is coherent: ESS is 1 and the resample condition never fires", () => {
    // n=1 edge case: a single particle always carries all the weight, so
    // ESS = 1 > 1 × 0.5 and the default threshold can never trigger.
    const f = new TeamStrengthFilter({ nTeams: 2, seed: 5, nParticles: 1 });
    f.predictStates();
    const r = f.update(A, B, 1);
    expect(r.essBefore).toBe(1);
    expect(r.essAfter).toBe(1);
    expect(r.resampled).toBe(false);
    expect(f.particleWeights()).toEqual([1]);
    expect(Number.isFinite(r.predictedHomeWinProb)).toBe(true);
    expect(f.diagnostics().degenerateCount).toBe(0);
  });
});

describe("weight invariants — normalised, finite, non-negative, no underflow", () => {
  it("holds across a 500-observation run (the log-space underflow regression)", () => {
    // A linear-space filter multiplies 500 probabilities ≤ 1 together and every
    // weight underflows to exactly 0 long before this point, making the
    // normalisation 0/0 = NaN. Log-space accumulation with max re-centring makes
    // that unreachable. OBSERVED: ESS 580.8 after 500 observations, 4 resamples,
    // degenerateCount 0, weightSum 0.9999999999999981.
    const f = new TeamStrengthFilter({ nTeams: 8, seed: 99 });
    for (let g = 0; g < 500; g++) {
      f.predictStates();
      const r = f.update(g % 8, (g + 3) % 8, (g * 7) % 11 < 6 ? 1 : 0);
      expect(Number.isFinite(r.predictedHomeWinProb)).toBe(true);
      expect(r.predictedHomeWinProb).toBeGreaterThanOrEqual(0);
      expect(r.predictedHomeWinProb).toBeLessThanOrEqual(1);
      expect(Number.isFinite(r.logScore)).toBe(true);
    }
    const w = f.particleWeights();
    expect(w).toHaveLength(DEFAULT_PARTICLES);
    expect(w.every((x) => Number.isFinite(x) && x >= 0)).toBe(true);
    expect(mean(w) * w.length).toBeCloseTo(1, 12);
    const d = f.diagnostics();
    expect(d.weightsFinite).toBe(true);
    expect(d.weightSum).toBeCloseTo(1, 12);
    expect(d.degenerateCount).toBe(0);
    expect(d.observations).toBe(500);
    expect(d.step).toBe(500);
    expect(f.posterior().every((p) => Number.isFinite(p.meanStrength) && p.varianceStrength >= 0)).toBe(true);
  });

  it("stays normalised even when the likelihood is brutally sharp", () => {
    // sigma = 1e-4 puts the logit at ~2500, so per-particle likelihoods span
    // thousands of nats. Some weights legitimately floor at 0; the vector must
    // still sum to 1 and stay finite. OBSERVED: min weight 0, max 0.005155.
    const f = new TeamStrengthFilter({ nTeams: 2, seed: 4, sigma: 1e-4, nParticles: 257 });
    for (let g = 0; g < 5; g++) {
      f.predictStates();
      f.update(A, B, 1);
    }
    const w = f.particleWeights();
    expect(w).toHaveLength(257);
    expect(w.every((x) => Number.isFinite(x) && x >= 0)).toBe(true);
    expect(mean(w) * 257).toBeCloseTo(1, 12);
    expect(Math.max(...w)).toBeGreaterThan(0);
  });
});

describe("degenerate likelihoods degrade honestly (never NaN)", () => {
  it("REGRESSION: the forecast is CONTINUOUS across the sigma-underflow boundary", () => {
    // y = numerator/sigma overflows to ±Infinity once sigma drops below about
    // 1.8e-308. An overflowed logit is NOT unusable — sigmoid(±∞) = 1/0 exactly,
    // so such a particle is simply a CERTAIN one. Dropping "non-finite" particles
    // (rather than only NaN ones) discards precisely the most informative members
    // of the cloud and renormalises over the maximally-ambiguous remainder, which
    // biases the forecast toward 0.5 and makes it discontinuous in sigma.
    //
    // The bug this pins produced: 0.775 at sigma=1e-308, 0.616 at 1e-309,
    // 0.500 at 1e-310 — while reporting degenerate=false and a healthy ESS.
    //
    // In the sigma → 0 limit the mixture collapses to the WEIGHTED FRACTION of
    // particles whose logit numerator is positive, so with N=1000 uniform
    // weights the answer must be an exact multiple of 1/1000. That is asserted
    // below and is not something a renormalise-over-the-finite-tail bug can fake.
    const reference = (() => {
      const f = new TeamStrengthFilter({ nTeams: 2, seed: 3, sigma: 1e-8 });
      f.predictStates();
      return f.predictHomeWinProbability(A, B);
    })();
    expect(reference).toBeCloseTo(0.775, 12); // 775 of 1000 particles favour home
    expect(Math.abs(reference * DEFAULT_PARTICLES - 775)).toBeLessThan(1e-9);

    for (const sigma of [1e-6, 1e-8, 1e-305, 1e-308, 1e-309, 1e-310, 1e-320, Number.MIN_VALUE]) {
      const f = new TeamStrengthFilter({ nTeams: 2, seed: 3, sigma });
      f.predictStates();
      expect(f.predictHomeWinProbability(A, B)).toBeCloseTo(reference, 12);
      const r = f.update(A, B, 1);
      expect(r.predictedHomeWinProb).toBeCloseTo(reference, 12);
      // No information was thrown away: the 775 particles that called the home
      // win keep log-likelihood 0, the other 225 die, so ESS is exactly 775.
      expect(r.essAfter).toBeCloseTo(775, 6);
      expect(r.degenerate).toBe(false);
      expect(f.diagnostics().degenerateCount).toBe(0);
      expect(Number.isFinite(r.logScore)).toBe(true);
      expect(f.diagnostics().weightSum).toBeCloseTo(1, 12);
    }
  });

  it("a likelihood every particle calls impossible collapses honestly, never to NaN", () => {
    // homeAdvantage = 10 against a prior sd(wᵀs_home − wᵀs_away) of 0.246 puts
    // EVERY particle at y = +Infinity, i.e. certain of a home win. Observing a
    // home LOSS is therefore an event the entire cloud called impossible — the
    // one genuine degeneracy. The filter must reset to uniform, flag it, and
    // keep every returned number finite.
    const f = new TeamStrengthFilter({ nTeams: 2, seed: 3, sigma: 1e-320, homeAdvantage: 10 });
    f.predictStates();
    const r = f.update(A, B, 0);
    expect(r.predictedHomeWinProb).toBe(1); // the cloud really was certain
    expect(r.degenerate).toBe(true);
    expect(Number.isNaN(r.predictedHomeWinProb)).toBe(false);
    expect(Number.isFinite(r.logScore)).toBe(true);
    expect(r.logScore).toBeGreaterThan(30); // maximally surprised, still finite
    expect(r.brier).toBeCloseTo(1, 12);
    const d = f.diagnostics();
    expect(d.degenerateCount).toBe(1);
    expect(d.weightsFinite).toBe(true);
    expect(d.weightSum).toBeCloseTo(1, 12);
    expect(d.ess).toBeCloseTo(DEFAULT_PARTICLES, 6); // honestly reset to uniform
    expect(f.particleWeights().every((x) => Number.isFinite(x))).toBe(true);
    // The posterior survives the collapse and is still readable.
    expect(Number.isFinite(f.posteriorFor(A).meanStrength)).toBe(true);
    expect(f.posteriorFor(A).varianceStrength).toBeGreaterThanOrEqual(0);
  });

  it("a small-but-finite sigma saturates the forecast without any NaN or collapse", () => {
    // sigma = 1e-6 drives the forecast to ~0.988 within a few games. This is the
    // regime where log(1−p) would be log(0) = −Infinity; −softplus(y) is finite.
    // OBSERVED: no degeneracy at all over 10 games, ESS 675.0.
    const f = new TeamStrengthFilter({ nTeams: 2, seed: 3, sigma: 1e-6 });
    const probs: number[] = [];
    for (let g = 0; g < 10; g++) {
      f.predictStates();
      const r = f.update(A, B, 1);
      probs.push(r.predictedHomeWinProb);
      expect(Number.isFinite(r.logScore)).toBe(true);
      expect(r.degenerate).toBe(false);
    }
    expect(probs[probs.length - 1]!).toBeGreaterThan(0.9);
    expect(probs.every((p) => Number.isFinite(p) && p >= 0 && p <= 1)).toBe(true);
    expect(f.diagnostics().degenerateCount).toBe(0);
  });

  it("survives an update issued before any predictStates call", () => {
    const f = new TeamStrengthFilter({ nTeams: 2, seed: 6 });
    const r = f.update(A, B, 1);
    expect(Number.isFinite(r.predictedHomeWinProb)).toBe(true);
    expect(f.diagnostics().step).toBe(0);
    expect(f.diagnostics().observations).toBe(1);
  });
});

describe("dynamics — mean reversion, random walk, interventions", () => {
  it("with processNoise = 0 the state contracts by exactly `a` each step", () => {
    // Fully deterministic dynamics: s ← a·s. The posterior mean must scale by
    // exactly 0.98. OBSERVED ratio 0.9800000000000015.
    const f = new TeamStrengthFilter({ nTeams: 2, seed: 9, processNoise: 0, initialSd: 0.1 });
    const before = f.posteriorFor(A).meanStrength;
    f.predictStates();
    const after = f.posteriorFor(A).meanStrength;
    expect(after / before).toBeCloseTo(0.98, 12);
    // Variance contracts by a² with no noise injected.
    const v0 = new TeamStrengthFilter({ nTeams: 2, seed: 9, processNoise: 0, initialSd: 0.1 });
    const varBefore = v0.posteriorFor(A).varianceStrength;
    v0.predictStates();
    expect(v0.posteriorFor(A).varianceStrength / varBefore).toBeCloseTo(0.98 ** 2, 10);
  });

  it("a = 1 is a pure random walk whose posterior variance grows with time", () => {
    // No mean reversion ⇒ the stationary variance is infinite ⇒ initialSd falls
    // back to processNoise, and Var grows ≈ linearly: dim·pn²·(1+steps).
    // OBSERVED: var 0.001165 at t=0 (expected 3·0.02² = 0.0012), 0.059184 after
    // 50 steps (expected 3·0.02²·51 = 0.0612).
    const f = new TeamStrengthFilter({ nTeams: 2, seed: 9, a: 1 });
    expect(f.initialSd).toBe(0.02);
    const v0 = f.posteriorFor(A).varianceStrength;
    expect(v0).toBeCloseTo(3 * 0.02 ** 2, 3);
    for (let i = 0; i < 50; i++) f.predictStates();
    const v50 = f.posteriorFor(A).varianceStrength;
    expect(v50).toBeGreaterThan(v0 * 20); // diffusive growth, not contraction
    expect(v50).toBeCloseTo(3 * 0.02 ** 2 * 51, 2);
  });

  it("interventions inject exactly B·u, accumulated through the AR(1) dynamics", () => {
    // Analytic check. Two filters share a seed (hence the same noise), one gets
    // a +0.05 intervention on every dimension of team A for 10 steps. Because
    // the dynamics are linear the difference in wᵀs is exactly deterministic:
    //     Σ_{k=0}^{9} a^k · (wᵀ·B·u) = 0.15 · (1 − 0.98¹⁰)/0.02 = 1.3719542…
    // OBSERVED difference: 1.376206 − 0.004252 = 1.3719542…, matching to 1e-12.
    const base = new TeamStrengthFilter({ nTeams: 2, seed: 21 });
    const shocked = new TeamStrengthFilter({ nTeams: 2, seed: 21 });
    for (let g = 0; g < 10; g++) {
      base.predictStates();
      shocked.predictStates([{ team: A, delta: 0.05 }]);
    }
    const analytic = 3 * 0.05 * ((1 - 0.98 ** 10) / (1 - 0.98));
    const observed = shocked.posteriorFor(A).meanStrength - base.posteriorFor(A).meanStrength;
    expect(observed).toBeCloseTo(analytic, 10);
    // And it moves the forecast the right way.
    expect(shocked.predictHomeWinProbability(A, B)).toBeGreaterThan(
      base.predictHomeWinProbability(A, B),
    );
    // Team B, which received no intervention, is untouched.
    expect(shocked.posteriorFor(B).meanStrength).toBeCloseTo(base.posteriorFor(B).meanStrength, 12);
  });

  it("a scalar delta broadcasts identically to the equivalent vector delta", () => {
    const scalar = new TeamStrengthFilter({ nTeams: 2, seed: 21 });
    const vector = new TeamStrengthFilter({ nTeams: 2, seed: 21 });
    for (let g = 0; g < 10; g++) {
      scalar.predictStates([{ team: A, delta: 0.05 }]);
      vector.predictStates([{ team: A, delta: [0.05, 0.05, 0.05] }]);
    }
    expect(vector.posteriorFor(A)).toEqual(scalar.posteriorFor(A));
  });

  it("repeated interventions on the same team accumulate; interventionGain scales them", () => {
    const once = new TeamStrengthFilter({ nTeams: 2, seed: 21 });
    const twice = new TeamStrengthFilter({ nTeams: 2, seed: 21 });
    const gained = new TeamStrengthFilter({ nTeams: 2, seed: 21, interventionGain: 2 });
    once.predictStates([{ team: A, delta: 0.1 }]);
    twice.predictStates([
      { team: A, delta: 0.05 },
      { team: A, delta: 0.05 },
    ]);
    gained.predictStates([{ team: A, delta: 0.05 }]);
    expect(twice.posteriorFor(A).meanStrength).toBeCloseTo(once.posteriorFor(A).meanStrength, 12);
    expect(gained.posteriorFor(A).meanStrength).toBeCloseTo(once.posteriorFor(A).meanStrength, 12);
  });

  it("predictStates leaves the weights alone (propagation is not evidence)", () => {
    const f = new TeamStrengthFilter({ nTeams: 2, seed: 12, sigma: 0.3, essThreshold: 1e-9 });
    f.predictStates();
    f.update(A, B, 1);
    const before = f.particleWeights();
    f.predictStates();
    expect(f.particleWeights()).toEqual(before);
  });
});

describe("configuration surface", () => {
  it("honours dim = 1 and a custom loading vector w", () => {
    const f = new TeamStrengthFilter({ nTeams: 2, seed: 5, dim: 1, nParticles: 100 });
    const post = f.posteriorFor(A);
    expect(post.meanByDim).toHaveLength(1);
    expect(post.meanStrength).toBeCloseTo(post.meanByDim[0]!, 12); // w = [1]
    // A doubled loading doubles the identified projection but not the coordinates.
    const g = new TeamStrengthFilter({ nTeams: 2, seed: 5, dim: 1, nParticles: 100, w: [2] });
    const gp = g.posteriorFor(A);
    expect(gp.meanByDim[0]!).toBeCloseTo(post.meanByDim[0]!, 12);
    expect(gp.meanStrength).toBeCloseTo(2 * post.meanStrength, 12);
  });

  it("exposes its configuration for the audit trail", () => {
    const f = new TeamStrengthFilter({ nTeams: 4, seed: 123, dim: 2, nParticles: 50, sigma: 0.5 });
    expect(f.seed).toBe(123);
    expect(f.nTeams).toBe(4);
    expect(f.dim).toBe(2);
    expect(f.nParticles).toBe(50);
    expect(f.sigma).toBe(0.5);
    expect(f.a).toBe(0.98);
    expect(f.processNoise).toBe(0.02);
    expect(f.homeAdvantage).toBe(0.2);
    expect(f.resampling).toBe("systematic");
    expect(DEFAULT_PARTICLES).toBe(1000); // NOT 10000 — serverless budget
  });
});

describe("refusals — structural misuse throws RangeError", () => {
  it("rejects invalid dimensions and particle counts", () => {
    expect(() => new TeamStrengthFilter({ nTeams: 1, seed: 1 })).toThrow(RangeError);
    expect(() => new TeamStrengthFilter({ nTeams: 2.5, seed: 1 })).toThrow(RangeError);
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: 1, dim: 0 })).toThrow(RangeError);
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: 1, dim: MAX_STRENGTH_DIM + 1 })).toThrow(RangeError);
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: 1, nParticles: 0 })).toThrow(RangeError);
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: 1, nParticles: MAX_PARTICLES + 1 })).toThrow(RangeError);
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: 1, nParticles: 10.5 })).toThrow(RangeError);
    // Boundaries are allowed.
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: 1, dim: MAX_STRENGTH_DIM, nParticles: 1 })).not.toThrow();
  });

  it("requires a usable seed — an unseeded stochastic model is not auditable", () => {
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: Number.NaN })).toThrow(RangeError);
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: Number.POSITIVE_INFINITY })).toThrow(RangeError);
  });

  it("rejects out-of-range dynamics and observation parameters", () => {
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: 1, a: 1.01 })).toThrow(RangeError); // explosive
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: 1, a: -0.1 })).toThrow(RangeError);
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: 1, processNoise: -1 })).toThrow(RangeError);
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: 1, sigma: 0 })).toThrow(RangeError);
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: 1, sigma: -1 })).toThrow(RangeError);
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: 1, homeAdvantage: Number.NaN })).toThrow(RangeError);
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: 1, essThreshold: 0 })).toThrow(RangeError);
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: 1, essThreshold: 1.5 })).toThrow(RangeError);
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: 1, initialSd: -0.1 })).toThrow(RangeError);
    // a = 1 (random walk) and processNoise = 0 (deterministic) are legal.
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: 1, a: 1, processNoise: 0 })).not.toThrow();
  });

  it("rejects a loading vector of the wrong length or with non-finite entries", () => {
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: 1, dim: 3, w: [1, 1] })).toThrow(RangeError);
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: 1, dim: 2, w: [1, Number.NaN] })).toThrow(RangeError);
    expect(() => new TeamStrengthFilter({ nTeams: 2, seed: 1, dim: 2, w: [1, 0] })).not.toThrow();
  });

  it("rejects an unknown resampling scheme and an oversized particle cloud", () => {
    expect(
      () =>
        new TeamStrengthFilter({
          nTeams: 2,
          seed: 1,
          // Deliberate bad input from a non-TS caller.
          resampling: "stratified" as unknown as "systematic",
        }),
    ).toThrow(RangeError);
    expect(
      () => new TeamStrengthFilter({ nTeams: 4000, seed: 1, nParticles: MAX_PARTICLES, dim: 16 }),
    ).toThrow(RangeError); // exceeds MAX_PARTICLE_CELLS
  });

  it("rejects bad matchups and non-binary outcomes", () => {
    const f = new TeamStrengthFilter({ nTeams: 3, seed: 1, nParticles: 16 });
    expect(() => f.update(0, 0, 1)).toThrow(RangeError); // a team cannot play itself
    expect(() => f.update(-1, 1, 1)).toThrow(RangeError);
    expect(() => f.update(0, 3, 1)).toThrow(RangeError);
    expect(() => f.update(0.5, 1, 1)).toThrow(RangeError);
    expect(() => f.update(0, 1, 0.5)).toThrow(RangeError); // must be 0 or 1
    expect(() => f.update(0, 1, 2)).toThrow(RangeError);
    expect(() => f.update(0, 1, Number.NaN)).toThrow(RangeError);
    expect(() => f.predictHomeWinProbability(1, 1)).toThrow(RangeError);
    expect(() => f.predictHomeWinProbability(0, 9)).toThrow(RangeError);
    expect(() => f.posteriorFor(3)).toThrow(RangeError);
    expect(() => f.posteriorFor(-1)).toThrow(RangeError);
    // Valid calls still work after the refusals — no state was corrupted.
    expect(Number.isFinite(f.update(0, 1, 1).predictedHomeWinProb)).toBe(true);
  });

  it("rejects malformed interventions", () => {
    const f = new TeamStrengthFilter({ nTeams: 3, seed: 1, dim: 3, nParticles: 16 });
    expect(() => f.predictStates([{ team: 5, delta: 0.1 }])).toThrow(RangeError);
    expect(() => f.predictStates([{ team: 0, delta: Number.NaN }])).toThrow(RangeError);
    expect(() => f.predictStates([{ team: 0, delta: Number.POSITIVE_INFINITY }])).toThrow(RangeError);
    expect(() => f.predictStates([{ team: 0, delta: [0.1, 0.2] }])).toThrow(RangeError); // wrong length
    expect(() => f.predictStates([{ team: 0, delta: [0.1, 0.2, Number.NaN] }])).toThrow(RangeError);
    // An empty list and an omitted list are both fine.
    expect(() => f.predictStates([])).not.toThrow();
    expect(() => f.predictStates()).not.toThrow();
  });
});
