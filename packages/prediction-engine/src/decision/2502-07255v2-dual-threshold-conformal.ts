// ============================================================
// ROC-tuned dual-threshold conformal abstention (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * below to pass on real walk-forward data, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2502.07255v2 — "Beyond Confidence: Adaptive Abstention in Dual-Threshold Conformal Prediction for Autonomous System Perception"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: dual-threshold conformalization — a conformal threshold
 * q_conf on a conformity score gives distribution-free coverage (≥ 1−α),
 * and a separate abstention threshold q_abs on a suspicion score is tuned by
 * ROC analysis (maximizing Youden's J for detecting unreliable predictions).
 * The paper stresses the marginal-vs-conditional coverage gap: one global
 * pair of thresholds over/under-covers across operating regimes.
 *
 * IMPROVEMENT (from ledger): Replace the fixed 70%-confidence abstention cutoff with an ROC-tuned dual-threshold conformal policy, and fit separate (q̂_conf, q̂_abs) thresholds per game regime (divisional/non-divisional, weather-affected, short-week) to attack the marginal-vs-conditional coverage gap the paper cites.
 *
 * ACCEPTANCE GATE: ADAPT if the ROC-tuned abstention threshold beats a fixed 70%-confidence cutoff on test-window published ROI by ≥1pp at comparable coverage, with empirical coverage within ±3pp of the 1−α target.
 */

export type GameRegime = "divisional" | "non-divisional" | "weather" | "short-week";

export interface ConformalPick {
  id: string;
  regime: GameRegime;
  /** Conformity score: higher = more typical / safer (e.g. calibrated density). */
  conformity: number;
  /** Suspicion score: higher = less trustworthy (e.g. 1 - top2 margin). */
  suspicion: number;
  predictedWinProb: number;
  won: boolean;
  /** Realized unit profit if published (e.g. +0.91 / -1.0 at -110). */
  profit: number;
}

export interface ThresholdPair {
  /** Publish only if conformity >= qConf. */
  qConf: number;
  /** Publish only if suspicion <= qAbs. */
  qAbs: number;
}

const REGIMES: GameRegime[] = ["divisional", "non-divisional", "weather", "short-week"];

/** Finite-sample (1-alpha)-style lower quantile of holdout conformity scores. */
export function calibrateConformalThreshold(scores: number[], alpha: number): number {
  if (scores.length === 0) return -Infinity;
  const sorted = [...scores].sort((a, b) => a - b);
  // Conformal finite-sample correction: k = ceil((n+1) * alpha), 1-indexed.
  const k = Math.ceil((sorted.length + 1) * alpha);
  return sorted[Math.min(Math.max(k, 1), sorted.length) - 1]!;
}

/**
 * ROC-tune the abstention threshold on holdout: label unreliable = lost pick,
 * sweep candidate thresholds over the suspicion scores, maximize Youden's J
 * (TPR - FPR). Ties broken toward the higher threshold (fewer rejections).
 */
export function rocTuneAbstentionThreshold(holdout: ConformalPick[]): number {
  if (holdout.length === 0) return Infinity;
  const scores = [...new Set(holdout.map((p) => p.suspicion))].sort((a, b) => a - b);
  let bestT = Infinity;
  let bestJ = -Infinity;
  for (const t of scores) {
    let tp = 0, fp = 0, nPos = 0, nNeg = 0;
    for (const p of holdout) {
      const unreliable = !p.won;
      const flagged = p.suspicion > t;
      if (unreliable) { nPos++; if (flagged) tp++; }
      else { nNeg++; if (flagged) fp++; }
    }
    const tpr = nPos > 0 ? tp / nPos : 0;
    const fpr = nNeg > 0 ? fp / nNeg : 0;
    const j = tpr - fpr;
    if (j > bestJ + 1e-12 || (Math.abs(j - bestJ) <= 1e-12 && t > bestT)) {
      bestJ = j;
      bestT = t;
    }
  }
  return bestT;
}

/** Fit a (qConf, qAbs) pair per game regime on holdout picks. */
export function fitThresholdsByRegime(
  holdout: ConformalPick[],
  alpha: number,
): Record<GameRegime, ThresholdPair> {
  const out = {} as Record<GameRegime, ThresholdPair>;
  for (const r of REGIMES) {
    const mp = holdout.filter((p) => p.regime === r);
    out[r] = {
      qConf: calibrateConformalThreshold(mp.map((p) => p.conformity), alpha),
      qAbs: rocTuneAbstentionThreshold(mp),
    };
  }
  return out;
}

/** Dual-threshold publish rule with a per-regime threshold pair. */
export function dualThresholdPublish(p: ConformalPick, t: ThresholdPair): boolean {
  return p.conformity >= t.qConf && p.suspicion <= t.qAbs;
}

/** Fixed 70%-confidence cutoff baseline: publish iff predictedWinProb >= 0.70. */
export function fixed70Publish(p: ConformalPick): boolean {
  return p.predictedWinProb >= 0.7;
}

export interface PolicyOutcome {
  /** Published fraction of the test window. */
  coverage: number;
  /** Mean unit profit over published picks. */
  roi: number;
  published: number;
}

/** Evaluate a publish rule on a test window. */
export function evaluatePolicy(
  picks: ConformalPick[],
  publish: (p: ConformalPick) => boolean,
): PolicyOutcome {
  const pub = picks.filter(publish);
  return {
    coverage: picks.length > 0 ? pub.length / picks.length : 0,
    roi: pub.length > 0 ? pub.reduce((a, p) => a + p.profit, 0) / pub.length : 0,
    published: pub.length,
  };
}

/**
 * Gate helper (verbatim acceptance gate): the ROC-tuned policy beats the
 * fixed 70% cutoff on test-window published ROI by >= 1pp at comparable
 * coverage (within 3pp), with empirical coverage within +/-3pp of 1-alpha.
 */
export function rocAbstentionGatePasses(
  roc: PolicyOutcome,
  fixed70: PolicyOutcome,
  alpha: number,
): boolean {
  const roiWin = roc.roi - fixed70.roi >= 0.01;
  const coverageComparable = Math.abs(roc.coverage - fixed70.coverage) <= 0.03;
  const coverageOnTarget = Math.abs(roc.coverage - (1 - alpha)) <= 0.03;
  return roiWin && coverageComparable && coverageOnTarget;
}
