/**
 * Bernoulli e-process toolkit — R&D, dark, unwired.
 *
 * Two APIs live here, both anytime-valid e-processes in Ville's sense:
 *
 *   1. Likelihood-ratio (eStep / eProcess / mixtureEProcess). One factor is
 *      the sequential LR of a Bernoulli forecast against a market (or other)
 *      null: y=1 → pHat/pMkt, y=0 → (1−pHat)/(1−pMkt). Under y ~ Bernoulli(pMkt)
 *      each factor has conditional mean 1, so the running product M_t is a
 *      nonnegative martingale and Ville's inequality gives
 *      P(exists t: M_t ≥ 1/α) ≤ α. `supM` is the statistic, not only terminal M.
 *      `mixtureEProcess` averages K already-exponentiated wealth paths
 *      (e-value averaging).
 *
 *   2. Betting increment (bettingEStep / bettingEProcess). Capital update
 *      M ← M · (1 + λ (y − y0)) with predictable λ < 1/y0 so the factor stays
 *      positive — the testing-by-betting step. Kept so the Ville suite still
 *      pins that martingale.
 *
 * Do not import this from a live path. Do not flip any gate.
 *
 * References:
 *   - Ville, J. (1939). Étude critique de la notion de collectif. Gauthier-Villars.
 *   - Shafer, G. & Vovk, V. (2019). Game-Theoretic Foundations for Probability and Finance. Wiley.
 *   - Ramdas, A., Ruf, J., Larsson, M. & Koolen, W. (2020). "Admissible anytime-valid sequential inference via supermartingales."
 *   - Ramdas, A., Grünwald, P., Vovk, V. & Shafer, G. (2023). "Game-theoretic statistics and safe anytime-valid inference." Statistical Science 38(4).
 *   - Waudby-Smith, I. & Ramdas, A. (2024). "Estimating means of bounded random variables by betting." J. R. Statist. Soc. B 86(1).
 *   - Vovk, V. & Wang, R. (2021). "E-values: Calibration, combination and applications." Ann. Statist. 49(3).
 */

export type BernoulliOutcome = 0 | 1;

function isOpenUnit(v: number): boolean {
  return Number.isFinite(v) && v > 0 && v < 1;
}

function isOutcome(y: number): y is BernoulliOutcome {
  return y === 0 || y === 1;
}

/**
 * One likelihood-ratio factor.
 *   y === 1 → pHat / pMkt
 *   y === 0 → (1 − pHat) / (1 − pMkt)
 * Identical forecasts (pHat === pMkt) return exactly 1.
 */
export function eStep(pHat: number, pMkt: number, y: BernoulliOutcome): number | null {
  if (!isOpenUnit(pHat) || !isOpenUnit(pMkt) || !isOutcome(y)) return null;
  const factor = y === 1 ? pHat / pMkt : (1 - pHat) / (1 - pMkt);
  if (!(factor > 0) || !Number.isFinite(factor)) return null;
  return factor;
}

export type EProcessResult = {
  readonly series: readonly number[];
  readonly logSeries: readonly number[];
  readonly supM: number;
  readonly M: number;
  readonly logM: number;
  readonly n: number;
};

/**
 * Running product M_t = Π eStep, accumulated in log space.
 * Ville cares about sup_t M_t, not only the terminal value.
 */
export function eProcess(
  pHats: readonly number[],
  pMkts: readonly number[],
  ys: readonly BernoulliOutcome[],
): EProcessResult | null {
  if (pHats.length !== pMkts.length || pMkts.length !== ys.length) return null;
  if (ys.length === 0) {
    return { series: [], logSeries: [], supM: 1, M: 1, logM: 0, n: 0 };
  }
  const series: number[] = [];
  const logSeries: number[] = [];
  let logM = 0;
  let supM = 1;
  for (let i = 0; i < ys.length; i++) {
    const factor = eStep(pHats[i]!, pMkts[i]!, ys[i]!);
    if (factor === null) return null;
    logM += Math.log(factor);
    const M = Math.exp(logM);
    if (!Number.isFinite(M) || !(M > 0)) return null;
    series.push(M);
    logSeries.push(logM);
    if (M > supM) supM = M;
  }
  return {
    series,
    logSeries,
    supM,
    M: series[series.length - 1]!,
    logM,
    n: ys.length,
  };
}

export type MixtureProcessResult = {
  readonly series: readonly number[];
  readonly supM: number;
  readonly M: number;
  readonly n: number;
};

/**
 * Average of K e-processes at each t: M_mix,t = (1/K) Σ_k M_k,t.
 * Each process is a running-wealth series (already exponentiated).
 */
export function mixtureEProcess(
  processes: readonly (readonly number[])[],
): MixtureProcessResult | null {
  if (processes.length === 0) return null;
  const n = processes[0]!.length;
  for (const p of processes) {
    if (p.length !== n) return null;
  }
  if (n === 0) return { series: [], supM: 1, M: 1, n: 0 };
  const k = processes.length;
  const series: number[] = [];
  let supM = Number.NEGATIVE_INFINITY;
  for (let t = 0; t < n; t++) {
    let sum = 0;
    for (const p of processes) {
      const v = p[t]!;
      if (!Number.isFinite(v)) return null;
      sum += v;
    }
    const mix = sum / k;
    series.push(mix);
    if (mix > supM) supM = mix;
  }
  return { series, supM, M: series[n - 1]!, n };
}

/* ------------------------------------------------------------------ */
/* v4 betting increment — kept, renamed, unwired                      */
/* ------------------------------------------------------------------ */

export type BettingEStepInput = {
  readonly pHat: number;
  readonly y: BernoulliOutcome;
  readonly y0: number;
  readonly lambda: number;
  readonly M0?: number;
};

export type BettingEStepResult = {
  readonly M: number;
  readonly logM: number;
  readonly factor: number;
};

export function bettingEStep(input: BettingEStepInput): BettingEStepResult | null {
  const { pHat, y, y0, lambda } = input;
  const M0 = input.M0 ?? 1;
  if (!isOpenUnit(pHat) || !isOpenUnit(y0) || !isOutcome(y)) return null;
  if (!Number.isFinite(lambda) || lambda <= 0) return null;
  if (!Number.isFinite(M0) || M0 <= 0) return null;
  if (lambda >= 1 / y0) return null;
  const factor = 1 + lambda * (y - y0);
  if (!(factor > 0) || !Number.isFinite(factor)) return null;
  const M = M0 * factor;
  if (!(M > 0) || !Number.isFinite(M)) return null;
  return { M, logM: Math.log(M), factor };
}

export type BettingEProcessResult = {
  readonly M: number;
  readonly logM: number;
  readonly supM: number;
  readonly n: number;
};

export function bettingEProcess(
  pHats: readonly number[],
  ys: readonly BernoulliOutcome[],
  y0: number,
  lambdas: readonly number[],
): BettingEProcessResult | null {
  if (pHats.length !== ys.length || ys.length !== lambdas.length) return null;
  if (ys.length === 0) return { M: 1, logM: 0, supM: 1, n: 0 };
  let M = 1;
  let supM = 1;
  for (let i = 0; i < ys.length; i++) {
    const step = bettingEStep({
      pHat: pHats[i]!,
      y: ys[i]!,
      y0,
      lambda: lambdas[i]!,
      M0: M,
    });
    if (step === null) return null;
    M = step.M;
    if (M > supM) supM = M;
  }
  return { M, logM: Math.log(M), supM, n: ys.length };
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function bernoulli(rand: () => number, p: number): BernoulliOutcome {
  return rand() < p ? 1 : 0;
}
