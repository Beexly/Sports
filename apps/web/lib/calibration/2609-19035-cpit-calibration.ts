/**
 * arXiv 2609.19035: Calibrated Predictive Distributions from Sample-Based Generators.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Calibrated predictive distributions from sample-based generators: adapt the reference bc-cpit as a post-processing layer over the engine's m Monte Carlo margin-of-victory draws per game, with splits = prior seasons (bias) / recent season (calibration) / holdout. Diagnostic-only until the gate passes (PIT CvM -50%, CRPS +3%, 90% coverage in [0.87, 0.93]).
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Adapt the reference bc-cpit implementation (~200 lines) as a post-processing layer over the engine's m Monte Carlo margin-of-victory draws per game, with splits = prior seasons (bias) / recent season (calibration) / holdout, so the engine's predictive distributions are calibrated before any downstream use.
 *
 * ACCEPTANCE GATE:
 * ADOPT CPIT as the engine's post-processing layer if on the 2022-2024 holdout it reduces PIT CvM >=50% vs raw samples AND improves mean CRPS >=3% AND 90% central coverage lands in [0.87, 0.93]; otherwise keep it as a diagnostic-only tool (PIT histograms over the existing samples).
 *
 * ENABLED=false: post-processing layer over engine Monte Carlo draws; needs a human call.
 */


export const ENABLED = false;

/** PIT of an outcome under an empirical forecast sample set. */
export function samplePIT(samples: readonly number[], y: number): number {
  const n = samples.length;
  if (n === 0) return 0.5;
  const below = samples.filter((s) => s < y).length;
  const equal = samples.filter((s) => s === y).length;
  // Randomized PIT for ties; deterministic midpoint here.
  const p = (below + 0.5 * equal) / n;
  return Math.min(Math.max(p, 1e-9), 1 - 1e-9);
}

/**
 * bc-cpit core: fit the empirical CDF G of calibration PITs, then quantile-map
 * each forecast draw through the inverse map: x_cal = F^{-1}(G^{-1}(F(x))).
 * G^{-1} corrects exactly the systematic PIT distortion (e.g. PITs piling
 * near 0 from a high-biased forecaster map back down through low quantiles).
 */
export function cpitTransform(
  forecastSamples: readonly number[],
  calibPits: readonly number[],
): number[] {
  const sortedPits = [...calibPits].sort((a, b) => a - b);
  const n = sortedPits.length;
  // Inverse PIT CDF: G^{-1}(p) via linear interpolation on the order statistics.
  const pitQuantile = (p: number): number => {
    if (n === 0) return p;
    const pos = p * (n - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    const t = pos - lo;
    return sortedPits[lo]! * (1 - t) + sortedPits[Math.min(hi, n - 1)]! * t;
  };
  const sortedSamples = [...forecastSamples].sort((a, b) => a - b);
  const m = sortedSamples.length;
  const sampleQuantile = (q: number): number => {
    const pos = Math.min(Math.max(q, 0), 1) * (m - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    const t = pos - lo;
    return sortedSamples[lo]! * (1 - t) + sortedSamples[Math.min(hi, m - 1)]! * t;
  };
  return forecastSamples.map((s) => {
    // PIT of this draw under its own forecast, then through G^{-1}, then
    // back through the forecast quantile function.
    const rank = sortedSamples.filter((x) => x <= s).length;
    const p = rank / m;
    return sampleQuantile(pitQuantile(p));
  });
}

/** Cramer-von Mises distance of PITs from Uniform(0,1). */
export function pitCvm(pits: readonly number[]): number {
  const sorted = [...pits].sort((a, b) => a - b);
  const n = sorted.length;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const u = (i + 1) / n;
    s += (sorted[i]! - u) * (sorted[i]! - u);
  }
  return s / n + 1 / (12 * n * n);
}

/** CRPS of a sample forecast vs an outcome (energy form). */
export function sampleCRPS(samples: readonly number[], y: number): number {
  const n = samples.length;
  const term1 = samples.reduce((a, s) => a + Math.abs(s - y), 0) / n;
  let term2 = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) term2 += Math.abs(samples[i]! - samples[j]!);
  }
  return term1 - 0.5 * (term2 / (n * n));
}

/** Empirical central coverage of a sample forecast at level 1 - alpha. */
export function centralCoverage(
  samples: readonly number[],
  y: number,
  alpha = 0.1,
): boolean {
  const sorted = [...samples].sort((a, b) => a - b);
  const lo = sorted[Math.floor((alpha / 2) * sorted.length)];
  const hi = sorted[Math.ceil((1 - alpha / 2) * sorted.length) - 1];
  return y >= lo! && y <= hi!;
}

export interface CpitGate {
  readonly cvmReduction: number;
  readonly crpsImprovement: number;
  readonly coverage90: number;
  readonly adopt: boolean;
}

/**
 * Adoption gate on the holdout: PIT CvM reduced >= 50% vs raw, mean CRPS
 * improved >= 3%, 90% central coverage in [0.87, 0.93].
 */
export function cpitGate(
  rawPits: readonly number[],
  recalPits: readonly number[],
  rawCrps: number,
  recalCrps: number,
  coverages: readonly boolean[],
): CpitGate {
  const cvmReduction =
    pitCvm(rawPits) > 0 ? (pitCvm(rawPits) - pitCvm(recalPits)) / pitCvm(rawPits) : 0;
  const crpsImprovement =
    rawCrps > 0 ? (rawCrps - recalCrps) / rawCrps : 0;
  const coverage90 = coverages.filter(Boolean).length / Math.max(coverages.length, 1);
  const adopt =
    cvmReduction >= 0.5 &&
    crpsImprovement >= 0.03 &&
    coverage90 >= 0.87 &&
    coverage90 <= 0.93;
  return { cvmReduction, crpsImprovement, coverage90, adopt };
}
