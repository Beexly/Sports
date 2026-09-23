// ============================================================
// GSE-SELE: learned reject score via ridge (REG) + pairwise SELE loss
// (DECIDE, additive) — wiring-wave2, NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * (AuRC +10% relative at the operating coverage; hard fail at the exact
 * card size) to pass, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2101.12523 — "Optimal strategies for reject option classifiers"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: freeze the classifier h and learn a separate gate
 * score for the reject option — either by regressing the realized loss
 * (REG: ridge regression of l on features) or by the pairwise SELE loss
 * that directly optimizes the ranking of losses; publish under a
 * bounded-coverage rule and evaluate by the area under the risk-coverage
 * curve (AuRC).
 *
 * IMPROVEMENT (from ledger): Build GSE-SELE: freeze the pick model h; for
 * each historical graded pick compute realized loss l (0/1 for ATS hit, or
 * negative units for bankroll loss); define psi(x) from pick features
 * (model edge, line movement, consensus disagreement, market count -- the
 * native 'MCP/margin' analog is GSE's raw model probability); learn the
 * gate score by ridge regression on realized loss (REG) and by the pairwise
 * SELE loss (SELE), selecting C by validation AuRC; bounded-coverage publish
 * rule.
 *
 * ACCEPTANCE GATE: ADAPT accepted if the learned score's AuRC beats the
 * probability-threshold baseline by >= 10% relative on walk-forward seasons
 * AND the win holds at the actual operating coverage (posted card size);
 * else REJECT. Hard fail: if the learned score's top-coverage picks don't
 * beat the baseline's at the exact card size GSE publishes, do not ship
 * regardless of AuRC.
 */

export interface SelePick {
  /** Realized loss l: 0/1 for ATS hit, or negative units for bankroll loss. */
  loss: number;
  /** psi(x): [modelEdge, lineMove, consensusDisagreement, marketCount, rawModelProb]. */
  psi: number[];
}

/** Solve (X^T X + C·I) w = X^T y via Gaussian elimination (small feature dims). */
export function ridgeFit(X: number[][], y: number[], C: number): number[] {
  const n = X.length;
  const d = X[0]?.length ?? 0;
  if (n === 0 || d === 0) return new Array<number>(d).fill(0);
  // Normal equations.
  const A: number[][] = Array.from({ length: d }, () => new Array<number>(d).fill(0));
  const b: number[] = new Array<number>(d).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j++) {
      b[j]! += X[i]![j]! * y[i]!;
      for (let k = 0; k < d; k++) A[j]![k]! += X[i]![j]! * X[i]![k]!;
    }
  }
  for (let j = 0; j < d; j++) A[j]![j]! += C;
  // Gaussian elimination with partial pivoting.
  const M = A.map((row, j) => [...row, b[j]!]);
  for (let col = 0; col < d; col++) {
    let piv = col;
    for (let r = col + 1; r < d; r++) if (Math.abs(M[r]![col]!) > Math.abs(M[piv]![col]!)) piv = r;
    const tmp = M[col]!;
    M[col] = M[piv]!;
    M[piv] = tmp;
    const diag = M[col]![col]!;
    if (Math.abs(diag) < 1e-12) continue;
    for (let r = 0; r < d; r++) {
      if (r === col) continue;
      const factor = M[r]![col]! / diag;
      for (let k = col; k <= d; k++) M[r]![k]! -= factor * M[col]![k]!;
    }
  }
  return M.map((row, j) => {
    const diag = row[j]!;
    return Math.abs(diag) < 1e-12 ? 0 : row[d]! / diag;
  });
}

/** REG gate: ridge regression of realized loss on psi(x). Returns the weight vector. */
export function regGateWeights(picks: SelePick[], C: number): number[] {
  return ridgeFit(
    picks.map((p) => p.psi),
    picks.map((p) => p.loss),
    C,
  );
}

const dot = (a: number[], b: number[]): number => a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0);

/**
 * Pairwise SELE loss: for pairs (i,j) with l_i < l_j, incur
 * max(0, 1 - (s_j - s_i)) where s = gate score — the gate must rank the
 * lower-loss pick as more publishable. C is the ridge penalty on w.
 */
export function selePairwiseLoss(picks: SelePick[], w: number[], C: number): number {
  let loss = 0;
  let pairs = 0;
  const scores = picks.map((p) => dot(w, p.psi));
  for (let i = 0; i < picks.length; i++) {
    for (let j = 0; j < picks.length; j++) {
      if (i === j) continue;
      if (picks[i]!.loss < picks[j]!.loss) {
        loss += Math.max(0, 1 - (scores[j]! - scores[i]!));
        pairs++;
      }
    }
  }
  const reg = C * w.reduce((a, x) => a + x * x, 0);
  return (pairs > 0 ? loss / pairs : 0) + reg;
}

/**
 * Area under the risk-coverage curve (AuRC): sort by gate score ascending
 * (low score = low predicted loss = publish first), sweep coverage, average
 * the selective risk. Lower is better.
 */
export function areaUnderRiskCoverage(picks: SelePick[], scores: number[]): number {
  const n = picks.length;
  if (n === 0) return 0;
  const order = scores.map((s, i) => ({ s, i })).sort((a, b) => a.s - b.s);
  let acc = 0;
  let cumLoss = 0;
  for (let k = 0; k < n; k++) {
    cumLoss += picks[order[k]!.i]!.loss;
    acc += cumLoss / (k + 1);
  }
  return acc / n;
}

/** Bounded-coverage publish rule: publish the top-coverage fraction by gate score. */
export function boundedCoveragePublish(scores: number[], coverage: number): boolean[] {
  const n = scores.length;
  const k = Math.max(1, Math.round(n * coverage));
  const order = scores.map((s, i) => ({ s, i })).sort((a, b) => a.s - b.s);
  const mask = new Array<boolean>(n).fill(false);
  for (let r = 0; r < k; r++) mask[order[r]!.i] = true;
  return mask;
}

/** Win rate of a published mask (hard-fail check at the exact card size). */
export function maskWinRate(mask: boolean[], losses: number[]): number {
  let wins = 0;
  let n = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    n++;
    if (losses[i]! <= 0) wins++;
  }
  return n > 0 ? wins / n : 0;
}

/**
 * Gate helper: AuRC beats the baseline by >= 10% relative AND the learned
 * score's top-coverage picks beat the baseline's at the exact card size
 * (hard fail otherwise).
 */
export function seleGatePasses(
  aurcLearned: number,
  aurcBaseline: number,
  winRateLearnedAtCardSize: number,
  winRateBaselineAtCardSize: number,
): boolean {
  if (!(winRateLearnedAtCardSize > winRateBaselineAtCardSize)) return false; // hard fail
  return aurcLearned <= 0.9 * aurcBaseline;
}
