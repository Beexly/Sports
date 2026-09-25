/**
 * Calibration gates (W1) — Brier/log-loss/AUC/ECE with isotonic rejection.
 *
 * Source: sjpagano — NFL win-probability model with held-out 2025 test
 * (Brier .1613, log loss .4831, AUC .8459, ECE .0331). He TESTED isotonic
 * calibration and REJECTED it when it worsened the holdout. Calibration is
 * a gate with a reject path, not a ritual.
 *
 * COMPOSES WITH: existing calibration code (additive gate, not replacement).
 */

export interface CalibrationMetrics {
  readonly brier: number;
  readonly logLoss: number;
  readonly auc: number;
  readonly ece: number;
  readonly n: number;
}

export interface IsotonicResult {
  readonly applied: boolean;
  readonly deltaBrier: number;
  readonly calibratedProbs: readonly number[];
  readonly reason: string;
}

export interface GateConfig {
  readonly maxBrier: number;
  readonly maxLogLoss: number;
  readonly minAuc: number;
  readonly maxEce: number;
}

export const DEFAULT_GATE_CONFIG: GateConfig = {
  maxBrier: 0.25,
  maxLogLoss: 0.70,
  minAuc: 0.55,
  maxEce: 0.08,
};

/**
 * Compute Brier, log-loss, AUC, ECE (10 bins).
 */
export function computeMetrics(
  probs: readonly number[],
  outcomes: readonly number[],
): CalibrationMetrics {
  if (probs.length === 0 || probs.length !== outcomes.length) {
    throw new Error("probs and outcomes must be non-empty and same length");
  }
  const n = probs.length;

  // Brier
  let brierSum = 0;
  for (let i = 0; i < n; i++) {
    brierSum += Math.pow(probs[i] - outcomes[i], 2);
  }
  const brier = brierSum / n;

  // Log-loss
  let llSum = 0;
  for (let i = 0; i < n; i++) {
    const p = Math.max(1e-15, Math.min(1 - 1e-15, probs[i]));
    llSum += -(outcomes[i] * Math.log(p) + (1 - outcomes[i]) * Math.log(1 - p));
  }
  const logLoss = llSum / n;

  // AUC (Mann-Whitney U)
  const pos: number[] = [];
  const neg: number[] = [];
  for (let i = 0; i < n; i++) {
    if (outcomes[i] === 1) pos.push(probs[i]);
    else neg.push(probs[i]);
  }
  let auc = 0.5;
  if (pos.length > 0 && neg.length > 0) {
    let wins = 0;
    for (const p of pos) {
      for (const ng of neg) {
        if (p > ng) wins += 1;
        else if (p === ng) wins += 0.5;
      }
    }
    auc = wins / (pos.length * neg.length);
  }

  // ECE (10 bins)
  const bins = new Map<number, { conf: number[]; out: number[] }>();
  for (let i = 0; i < n; i++) {
    const bin = Math.min(9, Math.floor(probs[i] * 10));
    if (!bins.has(bin)) bins.set(bin, { conf: [], out: [] });
    bins.get(bin)!.conf.push(probs[i]);
    bins.get(bin)!.out.push(outcomes[i]);
  }
  let ece = 0;
  for (const [_, b] of bins) {
    const avgConf = b.conf.reduce((a, c) => a + c, 0) / b.conf.length;
    const avgOut = b.out.reduce((a, c) => a + c, 0) / b.out.length;
    ece += (b.conf.length / n) * Math.abs(avgConf - avgOut);
  }

  return {
    brier: Number(brier.toFixed(6)),
    logLoss: Number(logLoss.toFixed(6)),
    auc: Number(auc.toFixed(6)),
    ece: Number(ece.toFixed(6)),
    n,
  };
}

/**
 * Isotonic calibration with rejection — applies ONLY if holdout Brier improves.
 * This is sjpagano's exact discipline: test it, reject it if it doesn't help.
 */
export function tryIsotonic(
  trainProbs: readonly number[],
  trainOutcomes: readonly number[],
  holdoutProbs: readonly number[],
  holdoutOutcomes: readonly number[],
): IsotonicResult {
  // Fit isotonic regression on train (pool adjacent violators)
  const pairs = trainProbs.map((p, i) => ({ p, y: trainOutcomes[i] }));
  pairs.sort((a, b) => a.p - b.p);

  // PAV algorithm
  const blocks: { p: number; y: number; w: number }[] = pairs.map((x) => ({ p: x.p, y: x.y, w: 1 }));
  for (let i = 0; i < blocks.length - 1; i++) {
    if (blocks[i].y > blocks[i + 1].y) {
      // Merge
      const merged = {
        p: (blocks[i].p * blocks[i].w + blocks[i + 1].p * blocks[i + 1].w) / (blocks[i].w + blocks[i + 1].w),
        y: (blocks[i].y * blocks[i].w + blocks[i + 1].y * blocks[i + 1].w) / (blocks[i].w + blocks[i + 1].w),
        w: blocks[i].w + blocks[i + 1].w,
      };
      blocks.splice(i, 2, merged);
      i = Math.max(-1, i - 2);
    }
  }

  // Map holdout probs through the isotonic fit
  const calibrate = (p: number): number => {
    if (blocks.length === 0) return p;
    // Find nearest block
    let best = blocks[0];
    let bestDist = Math.abs(p - best.p);
    for (const b of blocks) {
      const d = Math.abs(p - b.p);
      if (d < bestDist) {
        best = b;
        bestDist = d;
      }
    }
    return best.y;
  };

  const calibratedProbs = holdoutProbs.map(calibrate);

  // Evaluate on holdout
  const holdoutBrierBefore = computeMetrics(holdoutProbs, holdoutOutcomes).brier;
  const holdoutBrierAfter = computeMetrics(calibratedProbs, holdoutOutcomes).brier;
  const deltaBrier = holdoutBrierAfter - holdoutBrierBefore;

  if (deltaBrier < 0) {
    return {
      applied: true,
      deltaBrier: Number(deltaBrier.toFixed(6)),
      calibratedProbs,
      reason: `Isotonic improved holdout Brier by ${Math.abs(deltaBrier).toFixed(6)} — applied.`,
    };
  }
  return {
    applied: false,
    deltaBrier: Number(deltaBrier.toFixed(6)),
    calibratedProbs: holdoutProbs, // return uncalibrated
    reason: `Isotonic worsened holdout Brier by ${deltaBrier.toFixed(6)} — REJECTED. Original probs returned.`,
  };
}

/**
 * Run the full calibration gate. Returns metrics + isotonic decision.
 */
export function runCalibrationGate(
  trainProbs: readonly number[],
  trainOutcomes: readonly number[],
  holdoutProbs: readonly number[],
  holdoutOutcomes: readonly number[],
  config: GateConfig = DEFAULT_GATE_CONFIG,
): { metrics: CalibrationMetrics; isotonic: IsotonicResult; passed: boolean; failures: string[] } {
  const iso = tryIsotonic(trainProbs, trainOutcomes, holdoutProbs, holdoutOutcomes);
  const finalProbs = iso.applied ? iso.calibratedProbs : holdoutProbs;
  const metrics = computeMetrics(finalProbs, holdoutOutcomes);

  const failures: string[] = [];
  if (metrics.brier > config.maxBrier) failures.push(`Brier ${metrics.brier} > ${config.maxBrier}`);
  if (metrics.logLoss > config.maxLogLoss) failures.push(`LogLoss ${metrics.logLoss} > ${config.maxLogLoss}`);
  if (metrics.auc < config.minAuc) failures.push(`AUC ${metrics.auc} < ${config.minAuc}`);
  if (metrics.ece > config.maxEce) failures.push(`ECE ${metrics.ece} > ${config.maxEce}`);

  return { metrics, isotonic: iso, passed: failures.length === 0, failures };
}
