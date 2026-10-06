/**
 * Path-dependent form features (PP/MDD/R decomposition) for team ratings.
 *
 * For each team over a rolling N-game window of per-game performance (game
 * EPA margin or spread-cover margin), compute:
 *   C   — cumulative margin (the path's endpoint)
 *   MDD — worst peak-to-trough slide (the slump)
 *   R   — recovery since the slump's end
 * Teams with identical W-L but small-MDD/strong-R paths rate differently from
 * big-MDD/no-recovery paths. Also tracks MDD of the engine's own cumulative
 * pick P&L as a bankroll-regime signal gating stake ramp-up on recovery.
 *
 * @see arXiv:1403.8125v4 — "Maximum drawdown, recovery, and momentum"
 *
 * ACCEPTANCE GATE: ADAPT iff adding path-decomposition form features improves
 * 2025-holdout log-loss or pick ROI over the no-path baseline with statistical
 * significance (paired test, p < 0.05), OR the bankroll-regime gate improves
 * risk-adjusted return (Calmar). The gate is a backtest concern; this module
 * is the pure decomposition kernel, not wired into any live path.
 */

export interface PathDecomposition {
  /** Cumulative margin C (endpoint of the path). */
  cumulative: number;
  /** Maximum drawdown: worst peak-to-trough slide (≥ 0). */
  maxDrawdown: number;
  /** Recovery R since the end of the worst slump (≥ 0). */
  recovery: number;
  /** Index (0-based) where the worst trough occurred. */
  troughIndex: number;
}

/**
 * PP/MDD/R decomposition of a per-game performance path.
 * Empty path → all zeros (degenerate, documented).
 */
export function decomposePath(perGameMargins: readonly number[]): PathDecomposition {
  if (perGameMargins.length === 0) {
    return { cumulative: 0, maxDrawdown: 0, recovery: 0, troughIndex: -1 };
  }
  let running = 0;
  let peak = 0;
  let maxDd = 0;
  let troughIndex = 0;
  let endOfWorstSlump = 0;
  const cumValues: number[] = [];
  perGameMargins.forEach((m, i) => {
    running += m;
    cumValues.push(running);
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDd) {
      maxDd = dd;
      troughIndex = i;
      endOfWorstSlump = i;
    }
  });
  const troughValue = maxDd > 0 ? (cumValues[troughIndex] ?? 0) : running;
  const recovery = maxDd > 0 ? Math.max(0, running - troughValue) : 0;
  void endOfWorstSlump;
  return { cumulative: running, maxDrawdown: maxDd, recovery, troughIndex: maxDd > 0 ? troughIndex : -1 };
}

/**
 * Path-quality score: rewards high cumulative margin and strong recovery,
 * penalizes deep slumps. Higher = healthier path.
 */
export function pathQualityScore(d: PathDecomposition, slumpAversion = 1): number {
  return d.cumulative + d.recovery - slumpAversion * d.maxDrawdown;
}

/**
 * Bankroll-regime gate: stake ramp-up is allowed only when the engine's own
 * cumulative P&L has recovered (R ≥ fraction × MDD) from its worst slump.
 */
export function bankrollRegimeAllowsRamp(
  pnlPath: readonly number[],
  recoveryFraction = 0.5,
): boolean {
  const d = decomposePath(pnlPath);
  if (d.maxDrawdown === 0) return true; // no slump, no gate
  return d.recovery >= recoveryFraction * d.maxDrawdown;
}
