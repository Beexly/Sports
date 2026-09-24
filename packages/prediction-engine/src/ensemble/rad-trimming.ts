/**
 * RAD trimming for forecast combinations (arXiv 2208.00139).
 *
 * Robustness-Accuracy-Diversity trimming of the model pool:
 *  - per-model MSE-equivalent + pairwise MSEC on point forecasts;
 *  - RelDiv = AvgMSEC / AvgMSE: < 0.2 -> skip diversity handling;
 *    0.2-0.5 -> accuracy-only screening; > 0.5 -> full RAD;
 *  - Tukey's-fences screen on per-model absolute-error variance;
 *  - backward ADT elimination (kappa=1, delta=0.05) to the stop rule;
 *  - combine survivors with the simple average.
 * Diversity-only trimming (D) is REJECTED outright (the paper's MCB
 * results void it). Trimming must be validated on BOTH point and
 * interval scores, never point scores alone.
 *
 * ACCEPTANCE GATE: ADAPT the RelDiv-conditional protocol iff the
 * reproducible test replicates the core ordering (RAD >= A > None on
 * point scores, no interval degradation) on 2024 data; if RelDiv stays
 * < 0.2, downgrade to accuracy-only screening per the paper's guideline.
 *
 * Research-only module. Not wired into any live combination path.
 */

export interface TrimWeek {
  /** Point forecasts per game: games[g][m]. */
  forecasts: number[][];
  outcomes: number[];
  /** Interval widths per game per model (for the interval check). */
  widths?: number[][];
}

function mean(xs: readonly number[]): number {
  return xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);
}

/** Per-model MSE on the validation window. */
export function modelMse(weeks: readonly TrimWeek[], model: number): number {
  let s = 0;
  let n = 0;
  for (const w of weeks) {
    for (let g = 0; g < w.outcomes.length; g++) {
      const f = (w.forecasts[g] as number[])[model] as number;
      s += (f - (w.outcomes[g] as number)) ** 2;
      n++;
    }
  }
  if (n === 0) throw new Error("modelMse: no games");
  return s / n;
}

/**
 * Pairwise MSEC between two models: mean squared error of the
 * model-vs-model differences (diversity measure).
 */
export function pairwiseMsec(
  weeks: readonly TrimWeek[],
  a: number,
  b: number,
): number {
  let s = 0;
  let n = 0;
  for (const w of weeks) {
    for (let g = 0; g < w.outcomes.length; g++) {
      const fa = (w.forecasts[g] as number[])[a] as number;
      const fb = (w.forecasts[g] as number[])[b] as number;
      s += (fa - fb) ** 2;
      n++;
    }
  }
  if (n === 0) throw new Error("pairwiseMsec: no games");
  return s / n;
}

/**
 * RelDiv = AvgMSEC / AvgMSE: relative diversity of the pool.
 */
export function relDiv(weeks: readonly TrimWeek[], models: readonly number[]): number {
  if (models.length < 2) throw new Error("relDiv: need >= 2 models");
  const avgMse = mean(models.map((m) => modelMse(weeks, m)));
  let s = 0;
  let n = 0;
  for (let i = 0; i < models.length; i++) {
    for (let j = i + 1; j < models.length; j++) {
      s += pairwiseMsec(weeks, models[i] as number, models[j] as number);
      n++;
    }
  }
  const avgMsec = s / Math.max(1, n);
  return avgMsec / Math.max(1e-12, avgMse);
}

/**
 * Tukey's-fences screen: drop models whose absolute-error variance lies
 * above Q3 + 1.5 * IQR (erratic models).
 */
export function tukeyScreen(
  weeks: readonly TrimWeek[],
  models: readonly number[],
): number[] {
  if (models.length === 0) throw new Error("tukeyScreen: no models");
  const variances = models.map((m) => {
    const errs: number[] = [];
    for (const w of weeks) {
      for (let g = 0; g < w.outcomes.length; g++) {
        const f = (w.forecasts[g] as number[])[m] as number;
        errs.push(Math.abs(f - (w.outcomes[g] as number)));
      }
    }
    const mu = mean(errs);
    return mean(errs.map((e) => (e - mu) ** 2));
  });
  const sorted = [...variances].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)] as number;
  const q3 = sorted[Math.floor(sorted.length * 0.75)] as number;
  const fence = q3 + 1.5 * (q3 - q1);
  return models.filter((_, i) => (variances[i] as number) <= fence);
}

export interface AdtResult {
  survivors: number[];
  /** ADT objective trace (lower is better). */
  trace: number[];
}

/**
 * Backward ADT elimination: ADT(S) = avgMSE(S) - kappa * avgMSEC(S);
 * repeatedly drop the model whose removal most improves ADT until no
 * removal improves it by more than delta.
 */
export function adtElimination(
  weeks: readonly TrimWeek[],
  models: readonly number[],
  kappa = 1,
  delta = 0.05,
): AdtResult {
  if (models.length === 0) throw new Error("adtElimination: no models");
  const adt = (s: readonly number[]): number => {
    const avgMse = mean(s.map((m) => modelMse(weeks, m)));
    let msec = 0;
    let n = 0;
    for (let i = 0; i < s.length; i++) {
      for (let j = i + 1; j < s.length; j++) {
        msec += pairwiseMsec(weeks, s[i] as number, s[j] as number);
        n++;
      }
    }
    return avgMse - kappa * (n === 0 ? 0 : msec / n);
  };
  let current = [...models];
  const trace = [adt(current)];
  for (;;) {
    let bestDrop = -1;
    let bestAdt = trace[trace.length - 1] as number;
    for (let i = 0; i < current.length; i++) {
      const rest = current.filter((_, k) => k !== i);
      if (rest.length === 0) continue;
      const v = adt(rest);
      if (v < bestAdt) {
        bestAdt = v;
        bestDrop = i;
      }
    }
    if (bestDrop === -1 || (trace[trace.length - 1] as number) - bestAdt < delta) break;
    current = current.filter((_, k) => k !== bestDrop);
    trace.push(bestAdt);
  }
  return { survivors: current, trace };
}

export type TrimRegime = "skip" | "accuracy-only" | "full-rad";

export interface TrimDecision {
  regime: TrimRegime;
  relDiv: number;
  survivors: number[];
}

/**
 * RelDiv-conditional trimming protocol: screen, then choose the regime
 * by RelDiv (< 0.2 skip diversity handling; 0.2-0.5 accuracy-only;
 * > 0.5 full RAD).
 */
export function radTrim(
  weeks: readonly TrimWeek[],
  models: readonly number[],
): TrimDecision {
  if (models.length === 0) throw new Error("radTrim: no models");
  const screened = tukeyScreen(weeks, models);
  const pool = screened.length === 0 ? [...models] : screened;
  const rd = pool.length >= 2 ? relDiv(weeks, pool) : 0;
  if (rd < 0.2) return { regime: "skip", relDiv: rd, survivors: pool };
  if (rd <= 0.5) {
    // Accuracy-only: drop models worse than the pool median MSE.
    const mses = pool.map((m) => modelMse(weeks, m));
    const med = [...mses].sort((a, b) => a - b)[Math.floor(mses.length / 2)] as number;
    return {
      regime: "accuracy-only",
      relDiv: rd,
      survivors: pool.filter((_, i) => (mses[i] as number) <= med),
    };
  }
  const { survivors } = adtElimination(weeks, pool);
  return { regime: "full-rad", relDiv: rd, survivors };
}

/** Simple-average combination of survivors for one game. */
export function combineSurvivors(
  forecasts: readonly number[],
  survivors: readonly number[],
): number {
  if (survivors.length === 0) throw new Error("combineSurvivors: no survivors");
  return mean(survivors.map((m) => forecasts[m] as number));
}

/** Point-score (MSE) of a survivor set on test weeks. */
export function testMse(
  weeks: readonly TrimWeek[],
  survivors: readonly number[],
): number {
  let s = 0;
  let n = 0;
  for (const w of weeks) {
    for (let g = 0; g < w.outcomes.length; g++) {
      const p = combineSurvivors(w.forecasts[g] as number[], survivors);
      s += (p - (w.outcomes[g] as number)) ** 2;
      n++;
    }
  }
  return s / Math.max(1, n);
}
