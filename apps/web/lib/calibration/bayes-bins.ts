/**
 * Bayesian / empirical-Bayes reliability bins — offline R&D only.
 * Does NOT drive production maps, eligibility, or CALIBRATION_ADJUSTMENTS.
 */

export interface ObservedBin {
  readonly meanForecast: number;
  readonly wins: number;
  readonly n: number;
}

export interface ShrunkBin extends ObservedBin {
  readonly observedRate: number;
  readonly shrunkRate: number;
  readonly nu: number;
}

/**
 * Beta–Binomial shrink toward a prior mean m with strength nu:
 *   (wins + nu*m) / (n + nu)
 */
export function shrinkBin(
  wins: number,
  n: number,
  priorMean: number,
  nu: number,
): number {
  const nn = Math.max(0, n);
  const ww = Math.min(Math.max(0, wins), nn);
  const m = Math.min(1, Math.max(0, priorMean));
  const strength = Math.max(0, nu);
  if (nn + strength <= 0) return m;
  return (ww + strength * m) / (nn + strength);
}

/**
 * Moment / EB estimate of nu from bin observed rates around overall base rate.
 * Clamped to [nuMin, nuMax]. Pure heuristic for bake-offs — not a production map.
 */
export function fitEmpiricalBayesNu(
  bins: readonly ObservedBin[],
  options?: { readonly nuMin?: number; readonly nuMax?: number },
): { readonly nu: number; readonly priorMean: number; readonly method: string } {
  const nuMin = options?.nuMin ?? 1;
  const nuMax = options?.nuMax ?? 500;
  const totalN = bins.reduce((s, b) => s + Math.max(0, b.n), 0);
  const totalW = bins.reduce((s, b) => s + Math.max(0, b.wins), 0);
  const priorMean = totalN > 0 ? totalW / totalN : 0.5;

  const active = bins.filter((b) => b.n >= 5);
  if (active.length < 2) {
    return { nu: Math.min(nuMax, Math.max(nuMin, 20)), priorMean, method: "default-sparse" };
  }

  // Method-of-moments on binomial overdispersion
  let num = 0;
  let den = 0;
  for (const b of active) {
    const p = b.wins / b.n;
    const varTerm = (p - priorMean) ** 2;
    const binomVar = Math.max(1e-9, priorMean * (1 - priorMean) / b.n);
    num += b.n * Math.max(0, varTerm - binomVar);
    den += b.n * Math.max(1e-9, priorMean * (1 - priorMean) * (1 - 1 / b.n));
  }
  // Rough: excess var ≈ p(1-p)/(n+nu) form → nu ≈ p(1-p)/excess - mean_n-ish
  const excess = den > 0 ? num / den : 0;
  let nu = excess > 1e-6 ? priorMean * (1 - priorMean) / excess : nuMax;
  if (!Number.isFinite(nu)) nu = 20;
  nu = Math.min(nuMax, Math.max(nuMin, nu));
  return { nu, priorMean, method: "moment-eb" };
}

export function shrinkAllBins(
  bins: readonly ObservedBin[],
  nu?: number,
): { readonly bins: readonly ShrunkBin[]; readonly nu: number; readonly priorMean: number } {
  const fit = fitEmpiricalBayesNu(bins);
  const strength = nu ?? fit.nu;
  const out: ShrunkBin[] = bins.map((b) => {
    const observedRate = b.n > 0 ? b.wins / b.n : fit.priorMean;
    return {
      ...b,
      observedRate,
      shrunkRate: shrinkBin(b.wins, b.n, fit.priorMean, strength),
      nu: strength,
    };
  });
  return { bins: out, nu: strength, priorMean: fit.priorMean };
}
