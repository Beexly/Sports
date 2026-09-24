/**
 * CV-tuned soft-global forecast combination (arXiv 2207.07318, Eckert-Hyndman-Panagiotelis).
 *
 * Combine sub-model forecasts per week with weights that blend:
 *  - local weights: game-specific combination weights (per-game CV);
 *  - global weights: pooled-across-games combination weights;
 *  - soft-global: w = lambda * global + (1 - lambda) * local, with lambda
 *    tuned by cross-validation.
 * Compare CV-tuned soft-global against local-only, hard-global, and
 * equal-weight baselines on out-of-sample MSFE / log score, with 2020 as
 * the disruption negative control (global pooling should degrade) and
 * 2022 as the stable-season positive control.
 *
 * ACCEPTANCE GATE: no numeric gate in the ledger; the comparison harness
 * reports out-of-sample MSFE/log score for all four schemes plus the two
 * season controls.
 *
 * Research-only module. Not wired into any live combination path.
 */

export interface CombinationWeek {
  /** Model probability forecasts per game: games[g][m]. */
  forecasts: number[][];
  outcomes: number[];
}

/** Brier-optimal (inverse-MSE) weights from per-model MSEs. */
export function inverseMseWeights(mses: readonly number[]): number[] {
  if (mses.length === 0) throw new Error("inverseMseWeights: no models");
  const inv = mses.map((m) => 1 / Math.max(1e-12, m));
  const sum = inv.reduce((a, x) => a + x, 0);
  return inv.map((x) => x / sum);
}

/** Per-model MSE on a set of weeks (pooled across games). */
export function pooledMse(weeks: readonly CombinationWeek[], model: number): number {
  let s = 0;
  let n = 0;
  for (const w of weeks) {
    for (let g = 0; g < w.outcomes.length; g++) {
      const f = (w.forecasts[g] as number[])[model] as number;
      s += (f - (w.outcomes[g] as number)) ** 2;
      n++;
    }
  }
  if (n === 0) throw new Error("pooledMse: no games");
  return s / n;
}

/** Global (hard-global) weights: pooled across all training weeks. */
export function globalWeights(weeks: readonly CombinationWeek[]): number[] {
  const m = (weeks[0]?.forecasts[0] as number[] | undefined)?.length ?? 0;
  if (m === 0) throw new Error("globalWeights: no models");
  return inverseMseWeights(
    Array.from({ length: m }, (_, j) => pooledMse(weeks, j)),
  );
}

/** Local weights for one week: inverse-MSE on that week's games only. */
export function localWeights(week: CombinationWeek): number[] {
  const m = (week.forecasts[0] as number[] | undefined)?.length ?? 0;
  if (m === 0) throw new Error("localWeights: no models");
  const mses = Array.from({ length: m }, (_, j) => {
    let s = 0;
    for (let g = 0; g < week.outcomes.length; g++) {
      const f = (week.forecasts[g] as number[])[j] as number;
      s += (f - (week.outcomes[g] as number)) ** 2;
    }
    return s / Math.max(1, week.outcomes.length);
  });
  return inverseMseWeights(mses);
}

/**
 * Soft-global weights: lambda * global + (1 - lambda) * local.
 */
export function softGlobalWeights(
  global: readonly number[],
  local: readonly number[],
  lambda: number,
): number[] {
  if (global.length !== local.length) throw new Error("softGlobalWeights: length mismatch");
  if (lambda < 0 || lambda > 1) throw new Error("softGlobalWeights: lambda in [0,1]");
  return global.map((g, j) => lambda * g + (1 - lambda) * (local[j] as number));
}

/** Combine one game's model forecasts with weights. */
export function combine(forecasts: readonly number[], weights: readonly number[]): number {
  if (forecasts.length !== weights.length) throw new Error("combine: length mismatch");
  return forecasts.reduce((a, f, j) => a + f * (weights[j] as number), 0);
}

/**
 * Per-game local weights via leave-one-game-out: the weight vector used
 * for game g is fit on the week's other games only (no peeking at the
 * evaluated outcome).
 */
export function localWeightsLogo(week: CombinationWeek): number[][] {
  return week.forecasts.map((_, g) =>
    localWeights({
      forecasts: week.forecasts.filter((_, i) => i !== g),
      outcomes: week.outcomes.filter((_, i) => i !== g),
    }),
  );
}

function brierOf(weeks: readonly CombinationWeek[], predict: (w: CombinationWeek) => number[]): number {
  let s = 0;
  let n = 0;
  for (const w of weeks) {
    const ps = predict(w);
    for (let g = 0; g < w.outcomes.length; g++) {
      s += ((ps[g] as number) - (w.outcomes[g] as number)) ** 2;
      n++;
    }
  }
  return s / Math.max(1, n);
}

/**
 * Tune lambda by leave-one-week-out CV on the training weeks.
 */
export function tuneLambda(
  weeks: readonly CombinationWeek[],
  lambdas: readonly number[] = [0, 0.25, 0.5, 0.75, 1],
): { lambda: number; cvBrier: number } {
  if (weeks.length < 2) throw new Error("tuneLambda: need >= 2 weeks");
  let bestLambda = lambdas[0] as number;
  let bestBrier = Infinity;
  for (const lambda of lambdas) {
    let s = 0;
    let n = 0;
    for (let v = 0; v < weeks.length; v++) {
      const train = weeks.filter((_, i) => i !== v);
      const held = weeks[v] as CombinationWeek;
      const gw = globalWeights(train);
      const logo = localWeightsLogo(held);
      for (let g = 0; g < held.outcomes.length; g++) {
        const w = softGlobalWeights(gw, logo[g] as number[], lambda);
        const p = combine(held.forecasts[g] as number[], w);
        s += (p - (held.outcomes[g] as number)) ** 2;
        n++;
      }
    }
    const brier = s / n;
    if (brier < bestBrier) {
      bestBrier = brier;
      bestLambda = lambda;
    }
  }
  return { lambda: bestLambda, cvBrier: bestBrier };
}

export interface SchemeComparison {
  equal: number;
  local: number;
  global: number;
  softGlobal: number;
  lambda: number;
}

/**
 * Out-of-sample Brier for the four schemes: equal-weight, local-only,
 * hard-global, and CV-tuned soft-global (lambda tuned on train weeks).
 */
export function compareSchemes(
  train: readonly CombinationWeek[],
  test: readonly CombinationWeek[],
): SchemeComparison {
  if (train.length === 0 || test.length === 0) {
    throw new Error("compareSchemes: need train and test weeks");
  }
  const m = (train[0]?.forecasts[0] as number[] | undefined)?.length ?? 0;
  const eq = new Array<number>(m).fill(1 / Math.max(1, m));
  const gw = globalWeights(train);
  const { lambda } = tuneLambda(train);
  const equal = brierOf(test, (w) => w.forecasts.map((f) => combine(f, eq)));
  const local = brierOf(test, (w) => {
    const logo = localWeightsLogo(w);
    return w.forecasts.map((f, g) => combine(f, logo[g] as number[]));
  });
  const global = brierOf(test, (w) => w.forecasts.map((f) => combine(f, gw)));
  const softGlobal = brierOf(test, (w) => {
    const logo = localWeightsLogo(w);
    return w.forecasts.map((f, g) =>
      combine(f, softGlobalWeights(gw, logo[g] as number[], lambda)),
    );
  });
  return { equal, local, global, softGlobal, lambda };
}
