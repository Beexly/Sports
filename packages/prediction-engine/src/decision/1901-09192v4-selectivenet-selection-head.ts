// ============================================================
// SelectiveNet selection head (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: the selection head must be
 * trained with the selective loss below (a training-system call), and
 * activation requires the gate (>=2pp ROI at matched 30% coverage,
 * p<0.05) to pass, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 1901.09192v4 — "SelectiveNet: A Deep Neural Network with an Integrated Reject Option"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: SelectiveNet adds a selection head g(x) (sigmoid) to a
 * shared trunk alongside the prediction head f(x) and an auxiliary
 * full-coverage head h(x); it trains with a selective loss that minimizes
 * risk on the selected subset subject to a target-coverage penalty, so the
 * network learns *which* instances to abstain on instead of thresholding a
 * post-hoc score.
 *
 * IMPROVEMENT (from ledger): Add a selection head (shared trunk, sigmoid
 * gate, auxiliary full-coverage head) to the GSE pick model trained with
 * selective loss at target coverage c=0.30; publish only gated picks instead
 * of thresholding on model edge.
 *
 * ACCEPTANCE GATE: ADAPT if (a) beats (b) on test-window ROI of the covered
 * set by >=2 percentage points of ROI at matched 30% coverage AND the
 * win-rate lift is significant at p<0.05 (paired over picks); reject if the
 * gap is <2pp or insignificant -- then the threshold-on-edge null stands.
 */

export const SELECTIVENET_TARGET_COVERAGE = 0.3;

export interface SelectiveNetOutputs {
  /** Prediction head f(x): pick probabilities / values. */
  predictions: number[];
  /** Selection head g(x): sigmoid gate scores in (0,1). */
  gateScores: number[];
  /** Auxiliary head h(x): full-coverage predictions (training stabilizer). */
  auxiliary: number[];
}

/**
 * SelectiveNet training loss on one batch: selective risk over the gated
 * subset plus the coverage penalty lambda·max(0, c - coverage)^2 and the
 * auxiliary head loss (weighted beta). perPickLoss: 0/1 or unit loss.
 */
export function selectiveNetLoss(
  perPickLoss: number[],
  gateScores: number[],
  auxiliaryLoss: number[],
  targetCoverage = SELECTIVENET_TARGET_COVERAGE,
  lambda = 32,
  beta = 0.5,
): { total: number; selectiveRisk: number; coverage: number } {
  const n = perPickLoss.length;
  if (n === 0) return { total: 0, selectiveRisk: 0, coverage: 0 };
  let selNum = 0;
  let selDen = 0;
  let aux = 0;
  for (let i = 0; i < n; i++) {
    const g = Math.min(Math.max(gateScores[i]!, 0), 1);
    selNum += g * perPickLoss[i]!;
    selDen += g;
    aux += auxiliaryLoss[i]!;
  }
  const coverage = selDen / n;
  const selectiveRisk = selDen > 0 ? selNum / selDen : 0;
  const coveragePenalty = lambda * Math.pow(Math.max(0, targetCoverage - coverage), 2);
  const total = selectiveRisk + coveragePenalty + beta * (aux / n);
  return { total, selectiveRisk, coverage };
}

/**
 * Publish rule: publish only gated picks — the top-c fraction by selection
 * head score. Returns a boolean mask (true = publish).
 */
export function selectiveNetPublishMask(
  gateScores: number[],
  coverage = SELECTIVENET_TARGET_COVERAGE,
): boolean[] {
  const n = gateScores.length;
  if (n === 0) return [];
  const k = Math.max(1, Math.round(n * coverage));
  const order = gateScores.map((g, i) => ({ g, i })).sort((a, b) => b.g - a.g);
  const mask = new Array<boolean>(n).fill(false);
  for (let r = 0; r < k; r++) mask[order[r]!.i] = true;
  return mask;
}

/** ROI of the covered (published) set in units per unit staked. */
export function coveredSetRoi(
  mask: boolean[],
  outcomes: boolean[],
  odds: number[],
): { roi: number; n: number; winRate: number } {
  let profit = 0;
  let staked = 0;
  let wins = 0;
  let n = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    n++;
    staked += 1;
    if (outcomes[i]) {
      wins++;
      profit += odds[i]! - 1;
    } else {
      profit -= 1;
    }
  }
  return { roi: staked > 0 ? profit / staked : 0, n, winRate: n > 0 ? wins / n : 0 };
}

/**
 * Gate helper: (a) ROI lift >= 2pp at matched coverage AND (b) paired
 * win-rate lift significant at p<0.05 (normal approximation on the paired
 * differences over picks).
 */
export function selectiveNetGatePasses(
  roiSelective: number,
  roiBaseline: number,
  pairedWinDiffs: number[],
): boolean {
  if (roiSelective - roiBaseline < 0.02) return false;
  const n = pairedWinDiffs.length;
  if (n < 2) return false;
  const mean = pairedWinDiffs.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(
    pairedWinDiffs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (n - 1),
  );
  if (sd <= 0) return mean > 0;
  const z = mean / (sd / Math.sqrt(n));
  return z > 1.645; // one-sided p < 0.05
}
