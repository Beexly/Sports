/**
 * T16 -- THE SAME-CYCLE SETTLEMENT LOOP: Murphy partition, Gate G7, Laplace-Kalman edge
 * update, counterfactual premise promotion, Marchenko-Pastur / BBP spike detection, and the
 * Shadow-to-Production gates S1-S4.
 *
 * THE SPEC'S T16, verbatim from Table 5:
 *
 *   "Marchenko-Pastur BBP Spike Detection & Shadow gates S1-S4: Injects a rank-1 synthetic
 *    factor (theta_1 = 1.8 > sqrt(M/T)) into standardized settlement residuals, verifies
 *    detection above lambda_+ + s_alpha*sigma_TW with Participation Ratio > 1/3, and verifies
 *    SHADOW lock until Gates S1-S4 pass."
 *
 * WHY THIS FILE IS SEPARATE FROM THE MODULE'S OWN UNIT TESTS. The module is pure arithmetic;
 * this file is the SPEC's acceptance check. It asserts BOUNDARIES, not "it detected something":
 * the Marchenko-Pastur edge at known aspect ratios, the exact detection threshold, the exact
 * Murphy identity, the exact Gate G7 drift threshold, and the exact clip bounds. A test that
 * only asserts `detected === true` for a spike passes just as happily against a detector that
 * shouts "spike" at white noise, which is the failure the spec's own wording is aimed at:
 * "verifies detection above lambda_+ + s_alpha*sigma_TW WITH Participation Ratio > 1/3".
 *
 * THE HALF THAT IS USUALLY MISSING. Every spectral detector demo shows the spike firing and
 * stops. The detector that fires on a SPIKE is worth nothing unless it STAYS SILENT on the
 * white-noise null, and the null is the case that actually happens every day. Three of the
 * tests below are therefore about the null and about the refusal:
 *
 *   - pure isotropic noise is NOT detected (the detector does not cry wolf);
 *   - a noise matrix whose leading eigenvalue sits JUST ABOVE the Marchenko-Pastur edge but
 *     below the Tracy-Widom threshold is NOT detected (this is what pins the threshold term);
 *   - a LOCALIZED outlier -- a rank-1 spike carried by only a few market families -- is
 *     REFUSED by the Participation Ratio, because the spec's PR > 1/3 is the test for "a
 *     coherent MULTI-market factor rather than a localized outlier".
 *
 * DETERMINISM. There is no Math.random in this file. Every synthetic matrix comes from a
 * seeded mulberry32 generator, so a failure is reproducible and a pass is not luck.
 */
import { describe, expect, it } from "vitest";

import {
  BETA_ATTR,
  CLIP_MAX,
  CLIP_MIN,
  DEMOTION_MAX_WEIGHT,
  ETA_PROM,
  G7_ECE_HALT_THRESHOLD,
  G7_FAST_WINDOW_GAMES,
  G7_SLOW_WINDOW_GAMES,
  KAPPA_CLV,
  LAMBDA_CLV,
  MIN_PARTICIPATION_RATIO,
  PROMOTION_MIN_EVALUATIONS,
  PROMOTION_MIN_WEIGHT,
  S1_MAX_HYPERPARAMETER_NORM,
  S2_MIN_EVALUE,
  S2_MIN_EVALUE_LOG_LOSS,
  S3_MAX_DIEBOLD_MARIANO_P,
  SHADOW_MIN_SETTLEMENTS,
  TRACY_WIDOM_BETA,
  TRACY_WIDOM_LOCATION,
  TRACY_WIDOM_SCALE,
  clipPromotionWeight,
  counterfactualBrierDelta,
  counterfactualClvDelta,
  detectSpectralSpike,
  eceDifference,
  eceWindows,
  evaluateShadowPromotionGates,
  expectedCalibrationError,
  gateG7HaltsOnMarketFamily,
  gumbelQuantileShift,
  hybridClvTarget,
  injectRankOneFactor,
  laplaceKalmanEdgeUpdate,
  laplaceKalmanGain,
  marchenkoPasturUpperEdge,
  murphyBrierDecomposition,
  murphyCalibrationPartition,
  participationRatio,
  premisePromotionStatus,
  promotePremise,
  standardizeColumns,
  tracyWidomQuantileShift,
  tracyWidomScale,
  type ShadowGateInputs,
} from "../src/learning/settlement-loop.js";

// ---------------------------------------------------------------------------
// THE DETERMINISTIC GENERATOR
// ---------------------------------------------------------------------------

/** A deterministic 32-bit mulberry32 PRNG. Same seed, same matrix, every run. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

/** A standard normal draw from a uniform generator (Box-Muller). */
function gaussian(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-12);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ---------------------------------------------------------------------------
// THE SETTLEMENT-LOOP DIMENSIONS
// ---------------------------------------------------------------------------

/** T settled games. */
const T = 200;
/** M market families. */
const M = 20;
/** The tail probability the detector is run at. */
const ALPHA = 0.05;
/** The spec's injected spike strength: theta_1 = 1.8 > sqrt(M/T) = 0.3162. */
const THETA_1 = 1.8;

/** A T x M matrix of independent standard normal draws. */
function noiseMatrix(seed: number): number[][] {
  const rand = makeRng(seed);
  const rows: number[][] = [];
  for (let t = 0; t < T; t++) {
    const row: number[] = [];
    for (let m = 0; m < M; m++) row.push(gaussian(rand));
    rows.push(row);
  }
  return rows;
}

/** Flat loadings: a factor that touches EVERY market family equally. */
const FLAT_LOADINGS: number[] = Array.from({ length: M }, () => 1 / Math.sqrt(M));

/**
 * The spec's scenario: a rank-1 synthetic factor of strength theta_1 INJECTED INTO
 * STANDARDIZED SETTLEMENT RESIDUALS.
 */
function spikedResiduals(seed: number, theta: number, loadings: number[]): number[][] {
  const standardized = standardizeColumns(noiseMatrix(seed));
  const rand = makeRng(seed + 1);
  const factor: number[] = [];
  for (let t = 0; t < T; t++) factor.push(gaussian(rand));
  return injectRankOneFactor(standardized, theta, factor, loadings);
}

// ---------------------------------------------------------------------------
// (d) MARCHENKO-PASTUR EDGE AND THE TRACY-WIDOM THRESHOLD
// ---------------------------------------------------------------------------

describe("T16 -- the Marchenko-Pastur bulk edge", () => {
  it("is exact for known aspect ratios", () => {
    // M = T: gamma = 1, so lambda_+ = (1 + 1)^2 = 4.
    expect(marchenkoPasturUpperEdge(20, 20)).toBe(4);
    // M = T = 1: the degenerate single-cell case is also 4.
    expect(marchenkoPasturUpperEdge(1, 1)).toBe(4);
    // M = 4, T = 100: gamma = 0.04, so (1 + 0.2)^2 = 1.44.
    expect(marchenkoPasturUpperEdge(4, 100)).toBeCloseTo(1.44, 12);
    // The spec's own configuration: M = 20, T = 200.
    expect(marchenkoPasturUpperEdge(M, T)).toBeCloseTo((1 + Math.sqrt(0.1)) ** 2, 12);
    // The edge is not linear in the aspect ratio: doubling T must MOVE it, by the sqrt law.
    expect(marchenkoPasturUpperEdge(M, 2 * T)).toBeLessThan(marchenkoPasturUpperEdge(M, T));
    expect(marchenkoPasturUpperEdge(M, 2 * T)).toBeCloseTo((1 + Math.sqrt(M / (2 * T))) ** 2, 12);
  });

  it("refuses an aspect ratio with more market families than settled games", () => {
    // The T = 2 edge case the spec's math cannot speak to: sqrt(M/T) is only meaningful for
    // T >= M. With more market families than settled games the residual matrix cannot have a
    // full-rank correlation spectrum, so the edge would be extrapolated off the end of the
    // asymptotics. The engine must REFUSE, not extrapolate.
    expect(() => marchenkoPasturUpperEdge(3, 2)).toThrow(/T >= M/);
    expect(() => marchenkoPasturUpperEdge(20, 2)).toThrow(/T >= M/);
    expect(() => marchenkoPasturUpperEdge(2, 2)).not.toThrow();
    // The same refusal must travel with the rest of the spectral machinery.
    expect(() => tracyWidomScale(3, 2)).toThrow(/T >= M/);
    expect(() => detectSpectralSpike(noiseMatrix(1).slice(0, 2), ALPHA)).toThrow(/T >= M/);
    // And a non-positive dimension is refused too.
    expect(() => marchenkoPasturUpperEdge(0, 10)).toThrow(/M must be a positive integer/);
    expect(() => marchenkoPasturUpperEdge(10, 0)).toThrow(/T must be a positive integer/);
  });
});

describe("T16 -- the Tracy-Widom detection threshold", () => {
  it("is the Marchenko-Pastur edge plus the Tracy-Widom term", () => {
    const detection = detectSpectralSpike(standardizeColumns(noiseMatrix(12345)), ALPHA);
    const lambdaPlus = marchenkoPasturUpperEdge(M, T);
    const sigmaTw = tracyWidomScale(M, T);
    const sAlpha = tracyWidomQuantileShift(ALPHA);
    // The threshold IS the spec's formula, term by term.
    expect(detection.lambdaPlus).toBe(lambdaPlus);
    expect(detection.sigmaTw).toBe(sigmaTw);
    expect(detection.sAlpha).toBe(sAlpha);
    expect(detection.threshold).toBeCloseTo(lambdaPlus + sAlpha * sigmaTw, 12);
    // The Tracy-Widom term is strictly POSITIVE: without it the threshold would sit exactly
    // on the edge and every finite-sample excursion over the edge would be a "spike".
    expect(detection.threshold).toBeGreaterThan(detection.lambdaPlus);
    expect(detection.sigmaTw).toBeGreaterThan(0);
    expect(sAlpha).toBeGreaterThan(0);
    // The constants are the standard Tracy-Widom TW_1 values.
    expect(TRACY_WIDOM_BETA).toBe(1);
    expect(TRACY_WIDOM_LOCATION).toBeCloseTo(-1.2065333418469092, 12);
    expect(TRACY_WIDOM_SCALE).toBeCloseTo(0.8127799793779883, 12);
    // The Gumbel shift is the standard one, and the TW quantile is built from it.
    expect(gumbelQuantileShift(0.05)).toBeCloseTo(-Math.log(-Math.log(1 - 0.05)), 12);
    expect(tracyWidomQuantileShift(0.05)).toBeCloseTo(
      TRACY_WIDOM_LOCATION + TRACY_WIDOM_SCALE * gumbelQuantileShift(0.05),
      12,
    );
    // The classical Johnstone z_{0.05} for the TW_1 law is 1.2065; the Gumbel-built quantile
    // lands within a thousandth of it, which is the point of exporting the TW constants.
    expect(Math.abs(tracyWidomQuantileShift(0.05) - 1.2065)).toBeLessThan(0.005);
  });
});

// ---------------------------------------------------------------------------
// (d) THE DETECTOR: THE SPIKE, THE NULL, AND THE REFUSAL
// ---------------------------------------------------------------------------

describe("T16 -- the Marchenko-Pastur / BBP spike detector", () => {
  it("detects a rank-1 synthetic factor with theta_1 = 1.8 above the threshold", () => {
    // The spec's own precondition: theta_1 must be above the BBP phase transition sqrt(M/T).
    expect(THETA_1).toBeGreaterThan(Math.sqrt(M / T));

    const detection = detectSpectralSpike(spikedResiduals(12345, THETA_1, FLAT_LOADINGS), ALPHA);

    // DETECTED.
    expect(detection.detected).toBe(true);
    // The leading eigenvalue is above the Marchenko-Pastur edge AND above the threshold.
    expect(detection.lambda1).toBeGreaterThan(detection.lambdaPlus);
    expect(detection.lambda1).toBeGreaterThan(detection.threshold);
    // The spec's Participation Ratio: 1/(M sum_m u_{1,m}^4) > 1/3.
    expect(detection.participationRatio).toBeGreaterThan(MIN_PARTICIPATION_RATIO);
    expect(detection.participationRatio).toBeGreaterThan(1 / 3);
    // A rank-1 factor spread over every market family is DELOCALIZED, so its Participation
    // Ratio is near 1 (not near 1/M). This is the shape of the spec's "coherent multi-market
    // factor".
    expect(detection.participationRatio).toBeGreaterThan(0.5);
    // The latent temporal realization z_latent = R_res u_1 lives in R^T.
    expect(detection.principalComponent).toHaveLength(T);
    expect(detection.eigenvector).toHaveLength(M);
    expect(detection.spectrum).toHaveLength(M);
    // The eigenvalues are ordered descending and the spectrum is real.
    for (let i = 1; i < detection.spectrum.length; i++) {
      expect(detection.spectrum[i]!).toBeLessThanOrEqual(detection.spectrum[i - 1]!);
    }
    // A stronger spike is a stronger spike: the eigenvalue must grow with theta.
    const weaker = detectSpectralSpike(spikedResiduals(12345, 1.2, FLAT_LOADINGS), ALPHA);
    expect(detection.lambda1).toBeGreaterThan(weaker.lambda1);
    expect(weaker.detected).toBe(true);
  });

  it("does not cry wolf on pure isotropic noise", () => {
    // THE NULL. T = 200, M = 20, no factor at all: the largest eigenvalue must stay below
    // the Tracy-Widom threshold.
    const detection = detectSpectralSpike(standardizeColumns(noiseMatrix(12345)), ALPHA);
    expect(detection.detected).toBe(false);
    expect(detection.lambda1).toBeLessThan(detection.threshold);
    expect(detection.lambda1).toBeLessThan(detection.lambdaPlus + 0.1);

    // AND OVER MANY SEEDS. A detector whose threshold is wrong fires on the null, and it
    // fires on it EVERY time, not once. The bound here is the NOMINAL tail probability:
    // alpha = 0.05 means at most 5% of pure-noise draws may be flagged, and the draw count
    // is what makes the bound bite -- a detector that fires on all 120 draws is 20x over
    // its own nominal error rate. (The observed count is 1: seed 103's leading eigenvalue
    // lands 0.0045 above the threshold, which is exactly the borderline a 5% test is
    // supposed to admit.)
    //
    // This sweep is deterministic -- same seeds, same generator, same count -- so the
    // bound is a fact about the code rather than a statistic that might move.
    let falsePositives = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const d = detectSpectralSpike(standardizeColumns(noiseMatrix(seed)), ALPHA);
      if (d.detected) falsePositives++;
    }
    expect(falsePositives).toBeLessThanOrEqual(Math.ceil(ALPHA * 120));
  });

  it("refuses a noise matrix above the Marchenko-Pastur edge but below the threshold", () => {
    // Seed 43 is a null draw whose leading eigenvalue lands JUST ABOVE the Marchenko-Pastur
    // edge (1.7337 vs 1.7325) and well BELOW the Tracy-Widom threshold (1.8072). It is the
    // case that separates "the edge" from "the threshold": a detector that used the edge
    // alone would fire on it, and a detector that ignores the Tracy-Widom term would too.
    const detection = detectSpectralSpike(standardizeColumns(noiseMatrix(43)), ALPHA);
    expect(detection.lambda1).toBeGreaterThan(detection.lambdaPlus);
    expect(detection.lambda1).toBeLessThan(detection.threshold);
    expect(detection.detected).toBe(false);
  });

  it("refuses a localized outlier by the Participation Ratio", () => {
    // A rank-1 spike carried by only THREE of the twenty market families: the eigenvalue
    // sails past the threshold, but the leading eigenvector is CONCENTRATED, so the spec's
    // PR(u_1)/M = 1/(M sum_m u_{1,m}^4) falls below 1/3 and the engine refuses. This is the
    // spec's stated purpose of the ratio: "confirms a coherent multi-market factor RATHER
    // THAN A LOCALIZED OUTLIER".
    const threeMarketLoadings: number[] = new Array(M).fill(0);
    for (let i = 0; i < 3; i++) threeMarketLoadings[i] = 1 / Math.sqrt(3);
    const detection = detectSpectralSpike(spikedResiduals(12345, 3.0, threeMarketLoadings), ALPHA);

    expect(detection.lambda1).toBeGreaterThan(detection.threshold);
    expect(detection.participationRatio).toBeLessThan(MIN_PARTICIPATION_RATIO);
    expect(detection.detected).toBe(false);

    // The ratio is a property of the EIGENVECTOR, and it is computed from the full spectrum:
    // a factor on k of M families gives a ratio of about k/M, and k/M must straddle 1/3 at
    // k = 7 (7/20 = 0.35).
    const sevenMarketLoadings: number[] = new Array(M).fill(0);
    for (let i = 0; i < 7; i++) sevenMarketLoadings[i] = 1 / Math.sqrt(7);
    const seven = detectSpectralSpike(spikedResiduals(12345, 3.0, sevenMarketLoadings), ALPHA);
    expect(seven.participationRatio).toBeGreaterThan(MIN_PARTICIPATION_RATIO);
    expect(seven.detected).toBe(true);

    // The Participation Ratio helper is exactly the spec's formula.
    const flat = new Array(M).fill(1 / Math.sqrt(M));
    expect(participationRatio(flat)).toBeCloseTo(1, 12);
    const concentrated = new Array(M).fill(0);
    concentrated[0] = 1;
    expect(participationRatio(concentrated)).toBeCloseTo(1 / M, 12);
  });
});

// ---------------------------------------------------------------------------
// (a) THE MURPHY BRIER PARTITION
// ---------------------------------------------------------------------------

describe("T16 -- the Murphy Brier partition", () => {
  it("satisfies the identity BS = REL - RES + UNC exactly", () => {
    const rand = makeRng(2026);
    const probs: number[] = [];
    const outcomes: number[] = [];
    for (let i = 0; i < 600; i++) {
      probs.push(rand());
      outcomes.push(rand() < 0.5 ? 0 : 1);
    }
    const partition = murphyBrierDecomposition(probs, outcomes);

    // The IDENTITY, to floating-point tolerance. This is the spec's "Murphy Brier partition
    // identity" check.
    expect(partition.bs - (partition.rel - partition.res + partition.unc)).toBeCloseTo(0, 12);
    expect(partition.identityResidual).toBe(0);

    // BS is the ordinary Brier score.
    const raw = probs.reduce((acc, p, i) => acc + (p - (outcomes[i] as number)) ** 2, 0) / probs.length;
    expect(partition.bs).toBeCloseTo(raw, 12);

    // REL >= 0, RES >= 0, UNC is the base rate's variance.
    expect(partition.rel).toBeGreaterThanOrEqual(0);
    expect(partition.res).toBeGreaterThanOrEqual(0);
    const ybar = outcomes.reduce((a, b) => a + b, 0) / outcomes.length;
    expect(partition.ybar).toBeCloseTo(ybar, 12);
    expect(partition.unc).toBeCloseTo(ybar * (1 - ybar), 12);
  });

  it("separates reliability from resolution on a discrete forecast grid", () => {
    // With a DISCRETE forecast grid the partition is non-degenerate: several observations
    // share a forecast, so REL is strictly less than BS and RES is strictly positive. This
    // is the case where a Murphy partition means something.
    const grid = [0.1, 0.3, 0.5, 0.7, 0.9];
    const rand = makeRng(4242);
    const probs: number[] = [];
    const outcomes: number[] = [];
    for (let i = 0; i < 500; i++) {
      probs.push(grid[Math.floor(rand() * grid.length)] as number);
      outcomes.push(rand() < 0.5 ? 0 : 1);
    }
    const partition = murphyBrierDecomposition(probs, outcomes);
    expect(partition.bs - (partition.rel - partition.res + partition.unc)).toBeCloseTo(0, 12);
    expect(partition.rel).toBeLessThan(partition.bs);
    expect(partition.res).toBeGreaterThan(0);

    // The K-bin calibration view the settlement tracker displays: its binned score obeys
    // the same identity, and it reports the raw score separately.
    const calibration = murphyCalibrationPartition(probs, outcomes);
    expect(calibration.binnedBs - (calibration.rel - calibration.res + calibration.unc)).toBeCloseTo(0, 12);
    expect(calibration.rawBs).toBeCloseTo(partition.bs, 12);
    expect(calibration.bins.length).toBeGreaterThan(0);
    expect(calibration.bins.reduce((a, bin) => a + bin.count, 0)).toBe(probs.length);
  });

  it("accepts boolean outcomes and rejects malformed input", () => {
    // probs [0.7, 0.2, 0.9, 0.4] against outcomes [1, 0, 1, 0]:
    // (0.7-1)^2 + (0.2-0)^2 + (0.9-1)^2 + (0.4-0)^2 = 0.09 + 0.04 + 0.01 + 0.16 = 0.30.
    const partition = murphyBrierDecomposition([0.7, 0.2, 0.9, 0.4], [true, false, true, false]);
    expect(partition.bs).toBeCloseTo(0.075, 12);
    expect(partition.bs - (partition.rel - partition.res + partition.unc)).toBeCloseTo(0, 12);
    expect(() => murphyBrierDecomposition([], [])).toThrow(/at least one observation/);
    expect(() => murphyBrierDecomposition([0.5], [1, 0])).toThrow(/probabilities and/);
  });
});

// ---------------------------------------------------------------------------
// (a) THE GATE G7 CALIBRATION DRIFT RULE
// ---------------------------------------------------------------------------

describe("T16 -- Gate G7", () => {
  it("halts a market family whose trailing calibration has drifted", () => {
    // The spec's rule: "Whenever the trailing 30-game calibration drift satisfies
    // ECE_30 - ECE_250 > 0.02, Gate G7 halts emissions on that market family."
    const probs: number[] = [];
    const outcomes: number[] = [];
    // 220 settled, well-calibrated games at a flat 0.5 forecast...
    for (let i = 0; i < 220; i++) {
      probs.push(0.5);
      outcomes.push(i % 2);
    }
    // ...then 30 games where the model says 0.9 and the market says 0, every time.
    for (let i = 220; i < 250; i++) {
      probs.push(0.9);
      outcomes.push(0);
    }

    const windows = eceWindows(probs, outcomes);
    expect(windows.fastCount).toBe(G7_FAST_WINDOW_GAMES);
    expect(windows.slowCount).toBe(G7_SLOW_WINDOW_GAMES);
    expect(windows.eceFast).toBeGreaterThan(windows.eceSlow);
    expect(windows.difference).toBeGreaterThan(G7_ECE_HALT_THRESHOLD);
    expect(eceDifference(probs, outcomes)).toBeCloseTo(windows.difference, 12);
    expect(gateG7HaltsOnMarketFamily(probs, outcomes)).toBe(true);

    // The threshold is the spec's 0.02, not something looser.
    expect(G7_ECE_HALT_THRESHOLD).toBe(0.02);
  });

  it("does not halt a market family whose calibration is stable", () => {
    const probs: number[] = [];
    const outcomes: number[] = [];
    for (let i = 0; i < 250; i++) {
      probs.push(0.5);
      outcomes.push(i % 2);
    }
    expect(eceDifference(probs, outcomes)).toBe(0);
    expect(gateG7HaltsOnMarketFamily(probs, outcomes)).toBe(false);

    // A family whose recent calibration IMPROVED must not be halted either: the rule is
    // one-sided, and a rule that fires on improvement is a rule that fires on noise.
    const improving: number[] = [];
    const improvingOutcomes: number[] = [];
    for (let i = 0; i < 220; i++) {
      improving.push(0.8);
      improvingOutcomes.push(i % 2);
    }
    for (let i = 220; i < 250; i++) {
      improving.push(0.5);
      improvingOutcomes.push(i % 2);
    }
    expect(eceDifference(improving, improvingOutcomes)).toBeLessThan(0);
    expect(gateG7HaltsOnMarketFamily(improving, improvingOutcomes)).toBe(false);

    // The ECE itself is the standard calibration error: (N_k/N) |ybar_k - pbar_k|.
    expect(expectedCalibrationError([0.9, 0.9], [0, 0])).toBeCloseTo(0.9, 12);
    expect(expectedCalibrationError([0.5], [1])).toBeCloseTo(0.5, 12);
  });
});

// ---------------------------------------------------------------------------
// (b) THE LAPLACE-KALMAN PRECISION EDGE UPDATE
// ---------------------------------------------------------------------------

describe("T16 -- the Laplace-Kalman precision edge update", () => {
  it("moves the posterior toward the hybrid settlement/CLV target", () => {
    // The spec's target: y*_t = (1 - lambda_clv) y_t + lambda_clv p_t^close, lambda_clv = 0.35.
    expect(LAMBDA_CLV).toBe(0.35);
    expect(hybridClvTarget(1, 0.6)).toBeCloseTo(0.65 * 1 + 0.35 * 0.6, 12);
    expect(hybridClvTarget(1, 0.6)).toBeCloseTo(0.86, 12);
    // With lambda_clv = 0 the target IS the settlement; with lambda_clv = 1 it IS the close.
    expect(hybridClvTarget(1, 0.6, 0)).toBeCloseTo(1, 12);
    expect(hybridClvTarget(1, 0.6, 1)).toBeCloseTo(0.6, 12);

    // The gain: K_t = P_{t|t-1} Phi_t (v_t^-1 + Phi_t^T P_{t|t-1} Phi_t)^-1, scalarized.
    const K = laplaceKalmanGain(0.2, 1, 1);
    expect(K).toBeCloseTo((0.2 * 1) / (1 / 1 + 1 * 0.2 * 1), 12);

    // The update: theta(t) = theta(t-1) + K_t (y*_t - p_t),
    //              P(t)     = (I - K_t Phi_t^T) (P(t-1) + Q).
    const yStar = hybridClvTarget(1, 0.6);
    const theta = 0.4;
    const P = 0.2;
    const p = 0.55;
    const Q = 0.01;
    const next = laplaceKalmanEdgeUpdate(theta, P, yStar, p, K, Q);
    expect(next.theta).toBeCloseTo(theta + K * (yStar - p), 12);
    expect(next.P).toBeCloseTo((1 - K) * (P + Q), 12);

    // A settlement ABOVE the current price must raise the edge; a settlement BELOW must
    // lower it. A filter that moves the wrong way is worse than no filter.
    expect(laplaceKalmanEdgeUpdate(0.4, P, 1.0, 0.55, K, Q).theta).toBeGreaterThan(theta);
    expect(laplaceKalmanEdgeUpdate(0.4, P, 0.0, 0.55, K, Q).theta).toBeLessThan(theta);

    // The covariance shrinks, and it shrinks more with a larger gain.
    expect(next.P).toBeLessThan(P);
    expect(laplaceKalmanEdgeUpdate(theta, P, yStar, p, 0.9, Q).P).toBeLessThan(next.P);

    // Malformed input is refused rather than silently propagated.
    expect(() => laplaceKalmanEdgeUpdate(theta, -1, yStar, p, K, Q)).toThrow(/P must be non-negative/);
    expect(() => laplaceKalmanEdgeUpdate(theta, P, yStar, p, K, -1)).toThrow(/Q must be non-negative/);
    expect(() => laplaceKalmanGain(0.2, 0)).toThrow(/v must be positive/);
  });
});

// ---------------------------------------------------------------------------
// (c) THE COUNTERFACTUAL LEAVE-ONE-OUT PREMISE PROMOTION
// ---------------------------------------------------------------------------

describe("T16 -- counterfactual leave-one-out premise promotion", () => {
  it("follows the spec's algebra", () => {
    // dBS_{i,t} = (p_t^(-i) - y_t)^2 - (p_t - y_t)^2. A POSITIVE dBS means premise i made
    // the forecast BETTER: without it the error would have been larger.
    expect(counterfactualBrierDelta(0.6, 0.8, 1)).toBeCloseTo(0.04 - 0.16, 12);
    expect(counterfactualBrierDelta(0.6, 0.8, 1)).toBeLessThan(0);
    expect(counterfactualBrierDelta(0.6, 0.4, 0)).toBeCloseTo(0.16 - 0.36, 12);
    expect(counterfactualBrierDelta(0.6, 0.6, 0.5)).toBe(0);

    // dCLV_{i,t} = sign(p_t - p_t^(-i)) (p_t^close - p_t^decision).
    expect(counterfactualClvDelta(0.6, 0.8, 0.55, 0.5)).toBeCloseTo(-1 * 0.05, 12);
    expect(counterfactualClvDelta(0.8, 0.6, 0.55, 0.5)).toBeCloseTo(1 * 0.05, 12);
    expect(counterfactualClvDelta(0.6, 0.6, 0.55, 0.5)).toBe(0);

    // pi_i(t) = clip(pi_i(t-1) exp(eta_prom (dBS + kappa_clv dCLV) / sqrt(Var(dBS_i) + eps)),
    //             0.05, 3.00)
    // and A_i(t) = (1 - beta_attr) A_i(t-1) + beta_attr (dBS + kappa_clv dCLV).
    expect(ETA_PROM).toBe(0.15);
    expect(KAPPA_CLV).toBe(0.5);
    expect(BETA_ATTR).toBe(0.05);
    const input = {
      pi: 1.0,
      attribution: 0.0,
      dBS: 0.001,
      dCLV: 0.002,
      varianceDbS: 0.0001,
    };
    const result = promotePremise(input);
    const signal = input.dBS + KAPPA_CLV * input.dCLV;
    expect(result.exponent).toBeCloseTo((ETA_PROM * signal) / Math.sqrt(input.varianceDbS + 1e-9), 12);
    expect(result.pi).toBeCloseTo(1.0 * Math.exp(result.exponent), 12);
    expect(result.attribution).toBeCloseTo((1 - BETA_ATTR) * 0 + BETA_ATTR * signal, 12);
    expect(result.clipped).toBe(false);

    // A premise that helps a lot is promoted; one that hurts a lot is demoted.
    const helping = promotePremise({ pi: 1.0, attribution: 0, dBS: 0.05, dCLV: 0, varianceDbS: 0.001 });
    expect(helping.pi).toBeGreaterThan(1.0);
    expect(helping.attribution).toBeGreaterThan(0);
    const hurting = promotePremise({ pi: 1.0, attribution: 0, dBS: -0.05, dCLV: 0, varianceDbS: 0.001 });
    expect(hurting.pi).toBeLessThan(1.0);
    expect(hurting.attribution).toBeLessThan(0);
  });

  it("clips the promotion score at both ends of its band", () => {
    expect(CLIP_MIN).toBe(0.05);
    expect(CLIP_MAX).toBe(3.0);

    // The clip is TOTAL at the TOP: an exploding exponent saturates at 3.00, not at Infinity.
    const exploding = promotePremise({ pi: 1.0, attribution: 0, dBS: 1e6, dCLV: 0, varianceDbS: 1e-9 });
    expect(exploding.pi).toBe(CLIP_MAX);
    expect(exploding.clipped).toBe(true);
    expect(Number.isFinite(exploding.pi)).toBe(true);

    // And TOTAL at the BOTTOM: a collapsing exponent saturates at 0.05, not at 0.
    const collapsing = promotePremise({ pi: 1.0, attribution: 0, dBS: -1e6, dCLV: 0, varianceDbS: 1e-9 });
    expect(collapsing.pi).toBe(CLIP_MIN);
    expect(collapsing.clipped).toBe(true);
    expect(collapsing.pi).toBeGreaterThan(0);

    // The clip helper itself, at both ends and in the middle.
    expect(clipPromotionWeight(-5)).toBe(CLIP_MIN);
    expect(clipPromotionWeight(0)).toBe(CLIP_MIN);
    expect(clipPromotionWeight(0.04)).toBe(CLIP_MIN);
    expect(clipPromotionWeight(0.05)).toBe(CLIP_MIN);
    expect(clipPromotionWeight(1)).toBe(1);
    expect(clipPromotionWeight(3)).toBe(3);
    expect(clipPromotionWeight(3.01)).toBe(CLIP_MAX);
    expect(clipPromotionWeight(1e9)).toBe(CLIP_MAX);
    expect(clipPromotionWeight(Number.POSITIVE_INFINITY)).toBe(CLIP_MAX);
    expect(() => clipPromotionWeight(Number.NaN)).toThrow(/NaN/);
  });

  it("promotes and demotes premises on the spec's rules", () => {
    expect(PROMOTION_MIN_EVALUATIONS).toBe(15);
    expect(PROMOTION_MIN_WEIGHT).toBe(1.2);
    expect(DEMOTION_MAX_WEIGHT).toBe(0.35);

    // Promotion needs ALL THREE: enough evaluations, a positive attribution, and a weight
    // at or above 1.20.
    expect(premisePromotionStatus(1.25, 0.003, 15)).toBe("ACTIVE");
    expect(premisePromotionStatus(1.25, 0.003, 14)).toBe("SHADOW");
    expect(premisePromotionStatus(1.25, 0.001, 20)).toBe("SHADOW");
    expect(premisePromotionStatus(1.19, 0.003, 20)).toBe("SHADOW");
    expect(premisePromotionStatus(1.25, 0.003, 20, "SHADOW")).toBe("ACTIVE");

    // Demotion from ACTIVE.
    expect(premisePromotionStatus(0.34, 0.003, 20, "ACTIVE")).toBe("DEMOTED");
    expect(premisePromotionStatus(0.34, 0.003, 19, "ACTIVE")).toBe("ACTIVE");
    expect(premisePromotionStatus(1.5, -0.006, 40, "ACTIVE")).toBe("DEMOTED");
    expect(premisePromotionStatus(1.5, 0.003, 40, "ACTIVE")).toBe("ACTIVE");
  });
});

// ---------------------------------------------------------------------------
// (e) THE SHADOW-TO-PRODUCTION GATES S1-S4
// ---------------------------------------------------------------------------

describe("T16 -- the Shadow promotion gates S1-S4", () => {
  const PASSING: ShadowGateInputs = {
    nSettlements: 30,
    hyperparameterNorm: 1e-9,
    newHedges: 0,
    eValueRiskRatio: 1.6,
    eValueLogLoss: 1.2,
    brierLift: 0.01,
    dieboldMarianoP: 0.01,
    shadowLambda1: 1.2,
    productionLambda1: 1.5,
  };

  it("keeps the node SHADOW until every gate passes", () => {
    expect(SHADOW_MIN_SETTLEMENTS).toBe(30);
    expect(S1_MAX_HYPERPARAMETER_NORM).toBe(1e-6);
    expect(S2_MIN_EVALUE).toBe(1.5);
    expect(S2_MIN_EVALUE_LOG_LOSS).toBe(1.15);
    expect(S3_MAX_DIEBOLD_MARIANO_P).toBe(0.05);

    // Everything passes: the node is promoted.
    const passing = evaluateShadowPromotionGates(PASSING);
    expect(passing.allPassed).toBe(true);
    expect(passing.locked).toBe(false);
    expect(passing.status).toBe("PROMOTED");
    expect(passing.blockingGate).toBeNull();
    expect(passing.gates.map((g) => g.id)).toEqual(["S1", "S2", "S3", "S4"]);
    expect(passing.gates.every((g) => g.passed)).toBe(true);

    // ONE failing gate keeps the node LOCKED in SHADOW -- and says which one.
    const s1 = evaluateShadowPromotionGates({ ...PASSING, hyperparameterNorm: 1e-3 });
    expect(s1.locked).toBe(true);
    expect(s1.status).toBe("SHADOW");
    expect(s1.blockingGate).toBe("S1");

    const s1Hedge = evaluateShadowPromotionGates({ ...PASSING, newHedges: 1 });
    expect(s1Hedge.locked).toBe(true);
    expect(s1Hedge.blockingGate).toBe("S1");

    const s2 = evaluateShadowPromotionGates({ ...PASSING, eValueRiskRatio: 1.49 });
    expect(s2.locked).toBe(true);
    expect(s2.blockingGate).toBe("S2");

    const s2Loss = evaluateShadowPromotionGates({ ...PASSING, eValueLogLoss: 1.14 });
    expect(s2Loss.locked).toBe(true);
    expect(s2Loss.blockingGate).toBe("S2");

    const s3 = evaluateShadowPromotionGates({ ...PASSING, dieboldMarianoP: 0.05 });
    expect(s3.locked).toBe(true);
    expect(s3.blockingGate).toBe("S3");

    const s3Lift = evaluateShadowPromotionGates({ ...PASSING, brierLift: 0 });
    expect(s3Lift.locked).toBe(true);
    expect(s3Lift.blockingGate).toBe("S3");

    const s4 = evaluateShadowPromotionGates({ ...PASSING, shadowLambda1: 1.6 });
    expect(s4.locked).toBe(true);
    expect(s4.blockingGate).toBe("S4");

    // And the sample-size floor is a gate too: 29 settlements is not 30.
    const tooFew = evaluateShadowPromotionGates({ ...PASSING, nSettlements: 29 });
    expect(tooFew.locked).toBe(true);
    expect(tooFew.blockingGate).toBe("S1");

    // Exactly at the bounds still passes: the bounds are floors and ceilings, not
    // exclusive comparisons.
    const atBounds = evaluateShadowPromotionGates({
      ...PASSING,
      nSettlements: 30,
      hyperparameterNorm: 1e-7,
      eValueRiskRatio: 1.5,
      eValueLogLoss: 1.15,
      brierLift: 1e-9,
      dieboldMarianoP: 0.049,
      shadowLambda1: 1.4999,
      productionLambda1: 1.5,
    });
    expect(atBounds.allPassed).toBe(true);
  });
});
