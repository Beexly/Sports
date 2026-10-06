// ============================================================
// Distributionally-robust Kelly sizer (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * (worst-decile growth +20% at >=0.9x total growth) to pass, plus a human
 * call. Upgrades kelly-investigation.ts by adding uncertainty-set
 * machinery — that file is NOT modified here.
 */
export const ENABLED = false;

/**
 * arXiv: 1812.10371 — "Distributional Robust Kelly Gambling: Optimal Strategy under Uncertainty in the Long-Run"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: instead of maximizing E_pi[log(1+b^T r)] under a single
 * nominal distribution, maximize the worst case inf_{pi in Pi} over an
 * uncertainty set Pi of plausible outcome distributions — a convex program
 * whose solution protects long-run growth when the nominal model is wrong.
 *
 * IMPROVEMENT (from ledger): Build GSE's distributionally-robust Kelly
 * sizer as the direct upgrade to kelly-investigation.ts (which takes a
 * point win probability and has no uncertainty-set machinery): (1)
 * construct uncertainty sets Pi from GSE's calibration residuals -- for
 * each market type estimate the distribution of (realized - predicted)
 * probability errors on backtest data, sizing a box/ellipsoidal set Pi
 * around the nominal outcome distribution; (2) implement the robust
 * sizer maximize_b inf_{pi in Pi} E_pi[log(1 + b^T r)] as a convex
 * program (CVXPY-equivalent in the GSE stack), keeping the existing
 * fractional cap (<=0.25 default) as an additional constraint; (3) add a
 * robustness dial (set radius) to the staking config with a default
 * chosen by the acceptance test, logging nominal vs robust stake for
 * every pick for audit. Improvement beyond the paper: make Pi adaptive
 * -- shrink the uncertainty set as a function of GSE's live
 * calibration-in-the-small diagnostics (recent reliability by
 * probability bin), so well-calibrated regimes get near-nominal Kelly
 * and poorly-calibrated regimes get protection; hypothesis: adaptive-Pi
 * beats any fixed-radius set on realized growth.
 *
 * ACCEPTANCE GATE: ADOPT robust sizing only if it improves
 * worst-decile-of-weeks realized growth by >= 20% relative to baseline while
 * keeping total realized log growth >= 0.9x baseline. REJECT otherwise.
 */

export interface RobustSizerConfig {
  /** Uncertainty-set radius (the robustness dial). */
  radius: number;
  /** Fractional cap (default 0.25) as an additional constraint. */
  fractionalCap: number;
}

export const DEFAULT_ROBUST_CONFIG: RobustSizerConfig = { radius: 0.05, fractionalCap: 0.25 };

/**
 * Build a box uncertainty set Pi from calibration residuals: for the win
 * probability, p in [pHat - r, pHat + r] clipped to (0,1), where r is the
 * radius sized from the residual distribution (caller passes a quantile).
 */
export function boxUncertaintySet(pHat: number, radius: number): { pLo: number; pHi: number } {
  return {
    pLo: Math.min(Math.max(pHat - radius, 1e-6), 1 - 1e-6),
    pHi: Math.min(Math.max(pHat + radius, 1e-6), 1 - 1e-6),
  };
}

/** Size the box radius from calibration residuals (e.g. 90th percentile of |error|). */
export function radiusFromResiduals(residualErrors: number[], quantile = 0.9): number {
  if (residualErrors.length === 0) return DEFAULT_ROBUST_CONFIG.radius;
  const abs = residualErrors.map((e) => Math.abs(e)).sort((a, b) => a - b);
  // Nearest-rank quantile: smallest r covering at least `quantile` of |residuals|.
  const idx = Math.min(abs.length - 1, Math.max(0, Math.ceil(quantile * abs.length) - 1));
  return abs[idx]!;
}

/** Expected log-growth of stake b at win prob p and decimal odds. */
function growthAt(b: number, p: number, odds: number): number {
  const wWin = 1 + b * (odds - 1);
  const wLose = 1 - b;
  if (wWin <= 0 || wLose <= 0) return -Infinity;
  return p * Math.log(wWin) + (1 - p) * Math.log(wLose);
}

/**
 * Nominal (non-robust) Kelly fraction: maximize E[log(1+bX)] at pHat.
 * Logged alongside the robust stake for audit.
 */
export function nominalKellyFraction(pHat: number, odds: number, cap: number): number {
  const b = odds - 1;
  if (b <= 0 || pHat <= 0) return 0;
  // Closed form for the two-outcome case: b* = p/a - q ... solved directly.
  const f = pHat / b - (1 - pHat);
  return Math.min(Math.max(f, 0), cap);
}

/**
 * Distributionally-robust Kelly fraction: maximize_b inf_{p in [pLo,pHi]}
 * E_p[log(1+bX)]. For fixed b the objective is linear in p, so the worst
 * case is at a box corner; the outer max is via golden-section search.
 */
export function robustKellyFraction(
  pHat: number,
  odds: number,
  config: RobustSizerConfig = DEFAULT_ROBUST_CONFIG,
): { robust: number; nominal: number; pLo: number; pHi: number } {
  const { pLo, pHi } = boxUncertaintySet(pHat, config.radius);
  const worstCase = (b: number): number => Math.min(growthAt(b, pLo, odds), growthAt(b, pHi, odds));
  const gr = (Math.sqrt(5) - 1) / 2;
  let a = 0;
  let b = config.fractionalCap;
  let c = b - gr * (b - a);
  let d = a + gr * (b - a);
  for (let i = 0; i < 80; i++) {
    if (worstCase(c) > worstCase(d)) b = d;
    else a = c;
    c = b - gr * (b - a);
    d = a + gr * (b - a);
  }
  const robust = (a + b) / 2;
  return { robust, nominal: nominalKellyFraction(pHat, odds, config.fractionalCap), pLo, pHi };
}

/**
 * Adaptive Pi: shrink the uncertainty-set radius when live
 * calibration-in-the-small is good (recent ECE near target), so
 * well-calibrated regimes get near-nominal Kelly and poorly-calibrated
 * regimes get protection.
 */
export function adaptiveRadius(baseRadius: number, eceRecent: number, eceTarget: number): number {
  if (eceTarget <= 0) return baseRadius;
  const excess = Math.max(0, eceRecent - eceTarget) / eceTarget;
  return baseRadius * (1 + excess);
}

/** Gate helper: worst-decile growth +20% at >=0.9x total growth. */
export function robustSizerGatePasses(
  candidateWorstDecile: number,
  baselineWorstDecile: number,
  candidateTotalGrowth: number,
  baselineTotalGrowth: number,
): boolean {
  return (
    candidateWorstDecile >= 1.2 * baselineWorstDecile &&
    candidateTotalGrowth >= 0.9 * baselineTotalGrowth
  );
}
