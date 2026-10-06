/**
 * Median consensus combiner (arXiv 2207.08924v2).
 *
 * For each game, compute both the mean and the median of constituent
 * model probabilities. Default to the MEDIAN (robust to one bad model);
 * flag disagreement/dissent when |mean - median| > 3pp. Track the
 * constituent beat-all statistic: the fraction of games where the
 * consensus beats every constituent on log loss.
 *
 * ACCEPTANCE GATE: ADOPT the median default iff median log-loss is no
 * worse than mean within 0.5% AND the median beats all constituents in
 * at least 2% of games; REJECT the median default if it is > 1% worse
 * than the mean.
 *
 * Research-only module. Not wired into any live combination path.
 */

export const DISSENT_THRESHOLD_PP = 0.03;

function median(xs: readonly number[]): number {
  if (xs.length === 0) throw new Error("median: empty");
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1
    ? (s[mid] as number)
    : (((s[mid - 1] as number) + (s[mid] as number)) / 2);
}

function mean(xs: readonly number[]): number {
  if (xs.length === 0) throw new Error("mean: empty");
  return xs.reduce((a, x) => a + x, 0) / xs.length;
}

function clampP(p: number): number {
  return Math.min(1 - 1e-9, Math.max(1e-9, p));
}

export interface Consensus {
  mean: number;
  median: number;
  /** The default combined forecast (median). */
  combined: number;
  /** True when |mean - median| > 3pp: outlier/dissent flag. */
  dissent: boolean;
  disagreementPp: number;
}

/** Per-game mean/median consensus with the dissent flag. */
export function consensus(forecasts: readonly number[]): Consensus {
  if (forecasts.length === 0) throw new Error("consensus: no forecasts");
  const m = mean(forecasts);
  const med = median(forecasts);
  const disagreementPp = Math.abs(m - med);
  return {
    mean: m,
    median: med,
    combined: med,
    dissent: disagreementPp > DISSENT_THRESHOLD_PP,
    disagreementPp,
  };
}

function logLoss(p: number, y: number): number {
  const pc = clampP(p);
  return -(y * Math.log(pc) + (1 - y) * Math.log(1 - pc));
}

export interface ConsensusEval {
  meanLogLoss: number;
  medianLogLoss: number;
  /** Relative gap: (median - mean) / mean. Negative = median better. */
  relativeGap: number;
  /**
   * Beat-all statistic. Per-game log-loss is monotone in p, so a median
   * (bounded by the constituent extremes) can never strictly beat every
   * constituent in a single game. The operational statistic is pairwise:
   * the minimum over constituents of the fraction of games where the
   * median's log-loss beats that constituent's. A robust combiner should
   * beat each constituent head-to-head in a non-trivial share of games.
   */
  beatAllRate: number;
  /** Fraction of games flagged for dissent. */
  dissentRate: number;
  /** Acceptance verdict per the paper's gate. */
  verdict: "adopt" | "reject" | "inconclusive";
}

/**
 * Backtest the median default: log-loss vs the mean, the beat-all
 * statistic, and the adoption gate.
 */
export function evaluateConsensus(
  weeks: ReadonlyArray<{ forecasts: number[][]; outcomes: number[] }>,
): ConsensusEval {
  if (weeks.length === 0) throw new Error("evaluateConsensus: no weeks");
  let sMean = 0;
  let sMedian = 0;
  let dissent = 0;
  let n = 0;
  let nModels = 0;
  const beats: number[] = [];
  for (const w of weeks) {
    for (let g = 0; g < w.outcomes.length; g++) {
      const f = w.forecasts[g] as number[];
      const y = w.outcomes[g] as number;
      nModels = Math.max(nModels, f.length);
      while (beats.length < f.length) beats.push(0);
      const c = consensus(f);
      const llMean = logLoss(c.mean, y);
      const llMedian = logLoss(c.median, y);
      sMean += llMean;
      sMedian += llMedian;
      f.forEach((p, j) => {
        if (llMedian < logLoss(p, y)) (beats[j] as number)++;
      });
      if (c.dissent) dissent++;
      n++;
    }
  }
  if (n === 0) throw new Error("evaluateConsensus: no games");
  const meanLogLoss = sMean / n;
  const medianLogLoss = sMedian / n;
  const relativeGap = (medianLogLoss - meanLogLoss) / Math.max(1e-12, meanLogLoss);
  const beatAllRate =
    nModels === 0 ? 0 : Math.min(...beats.slice(0, nModels).map((b) => b / n));
  let verdict: ConsensusEval["verdict"] = "inconclusive";
  if (relativeGap <= 0.005 && beatAllRate >= 0.02) verdict = "adopt";
  else if (relativeGap > 0.01) verdict = "reject";
  return {
    meanLogLoss,
    medianLogLoss,
    relativeGap,
    beatAllRate,
    dissentRate: dissent / n,
    verdict,
  };
}
