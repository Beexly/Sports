// ============================================================
// MC-dropout + certainty-based rejection (CER) selective prediction
// (DECIDE, additive) — wiring-wave2, NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * (beats single-pass baseline on AURCC and realized ROI at fixed coverage)
 * to pass, plus a human call. If only metrics move but ROI doesn't, the
 * machinery stays a monitoring layer (risk-coverage reporting).
 */
export const ENABLED = false;

/**
 * arXiv: 2409.18645v1 — "The Craft of Selective Prediction: Towards Reliable Case Outcome Classification"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: run T stochastic forward passes (MC-dropout) and
 * abstain by certainty-based rejection (CER): picks whose predictive
 * distribution is diffuse (high variance / low mean confidence) are
 * rejected at a fixed coverage, with the rejection aggressiveness gamma
 * learned per task.
 *
 * IMPROVEMENT (from ledger): Add MC-dropout plus certainty-based rejection
 * (CER) selective prediction to the engine with γ learned per market type,
 * so GSE abstains on low-confidence picks at fixed coverage; if the
 * abstention moves metrics but not ROI, keep it as a risk–coverage
 * monitoring layer rather than a selection change.
 *
 * ACCEPTANCE GATE: ADAPT bar: MC-dropout + CER must beat the current
 * single-pass baseline on AURCC and realized ROI at fixed coverage on a
 * hold-out season; if only the metrics move but ROI doesn't, adopt the
 * abstention machinery as a monitoring layer (risk–coverage reporting)
 * rather than a selection change.
 */

export interface McDropoutStats {
  mean: number;
  variance: number;
  /** Certainty: mean confidence adjusted for spread. Higher = more certain. */
  certainty: number;
}

/**
 * MC-dropout statistics over T stochastic forward passes (caller supplies
 * the pass outputs — the dropout passes themselves are a model-system
 * call). Certainty = mean − sqrt(variance): high mean, tight distribution.
 */
export function mcDropoutStats(passProbs: number[]): McDropoutStats {
  const n = passProbs.length;
  if (n === 0) return { mean: 0, variance: 0, certainty: 0 };
  const mean = passProbs.reduce((a, b) => a + b, 0) / n;
  const variance = passProbs.reduce((a, p) => a + (p - mean) * (p - mean), 0) / n;
  return { mean, variance, certainty: mean - Math.sqrt(variance) };
}

/**
 * Certainty-based rejection (CER): reject (abstain) when certainty falls
 * below the gamma threshold. Gamma is learned per market type.
 */
export function cerReject(certainty: number, gamma: number): boolean {
  return certainty < gamma;
}

/**
 * Learn gamma per market type: the certainty threshold reproducing the
 * target coverage (publish fraction) on validation picks of that market.
 */
export function fitGammaPerMarket(
  certaintiesByMarket: Record<string, number[]>,
  targetCoverage: number,
): Record<string, number> {
  const gammas: Record<string, number> = {};
  for (const [market, certs] of Object.entries(certaintiesByMarket)) {
    if (certs.length === 0) {
      gammas[market] = 0;
      continue;
    }
    const sorted = [...certs].sort((a, b) => a - b);
    // Publish the top-coverage fraction: gamma = the (1-coverage) quantile.
    const idx = Math.min(sorted.length - 1, Math.floor((1 - targetCoverage) * sorted.length));
    gammas[market] = sorted[idx]!;
  }
  return gammas;
}

export interface CerPick {
  id: string;
  market: string;
  passProbs: number[];
  won: boolean;
  odds: number;
}

/** Apply MC-dropout + CER selection at fixed coverage per market. */
export function cerSelect(
  picks: CerPick[],
  gammas: Record<string, number>,
): { selected: CerPick[]; rejected: CerPick[] } {
  const selected: CerPick[] = [];
  const rejected: CerPick[] = [];
  for (const p of picks) {
    const { certainty } = mcDropoutStats(p.passProbs);
    if (cerReject(certainty, gammas[p.market] ?? 0)) rejected.push(p);
    else selected.push(p);
  }
  return { selected, rejected };
}

/** Area under the risk-coverage curve (lower = better). */
export function aurcc(picks: CerPick[], scores: number[]): number {
  const n = picks.length;
  if (n === 0) return 0;
  const order = scores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s); // high certainty first
  let acc = 0;
  let cumLoss = 0;
  for (let k = 0; k < n; k++) {
    cumLoss += picks[order[k]!.i]!.won ? 0 : 1;
    acc += cumLoss / (k + 1);
  }
  return acc / n;
}

/** Realized ROI of a selected set (units per unit staked). */
export function selectedRoi(picks: CerPick[]): number {
  if (picks.length === 0) return 0;
  const profit = picks.reduce((a, p) => a + (p.won ? p.odds - 1 : -1), 0);
  return profit / picks.length;
}

/**
 * Gate helper: beats the single-pass baseline on AURCC AND realized ROI at
 * fixed coverage. (If only AURCC moves, adopt as a monitoring layer.)
 */
export function cerGatePasses(
  aurccCer: number,
  aurccBaseline: number,
  roiCer: number,
  roiBaseline: number,
): { adoptSelection: boolean; adoptMonitoring: boolean } {
  const metricsWin = aurccCer < aurccBaseline;
  const roiWin = roiCer > roiBaseline;
  return { adoptSelection: metricsWin && roiWin, adoptMonitoring: metricsWin && !roiWin };
}
