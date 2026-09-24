/**
 * arXiv:2606.07811 — When Do Markets Fully Process Public Information? Evidence from Real-Time Prediction Markets
 *
 * In-play market-updating audit: GSE's own out-of-sample in-play win probability benchmark (cross-fit, no
 * market input) vs market prices; estimate Delta p = alpha + beta Delta q to replicate the <1 updating
 * finding, then restrict drift-following to soft-book-lags-sharp-book cross-book opportunities.
 *
 * Improvement: Build GSE's own out-of-sample in-play win-probability benchmark on nflverse play-by-play (cross-fit, no market input) and audit in-play market updating: estimate Delta p = alpha + beta Delta q to replicate the <1 updating finding on 2024-2025 NFL, then restrict drift-following to cross-book opportunities where a soft retail book lags a sharp book (Pinnacle) — executable because the stale price is taken, not the lagging book's spread.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adapt the updating-gap framework into GSE's in-play product if, on 2024–2025 NFL: (i) β is significantly below 1 and drift ρ significantly positive net of benchmark changes; and (ii) the drift-follow signal survives bid–ask costs with positive expected value over ≥500 in-play events, OR the liquidity-gated blender beats a fixed 50/50 market/model blend on Brier score by ≥0.002.
 */

/** One in-play snapshot pair: benchmark change vs market change. */
export interface UpdatePair {
  /** Benchmark win-prob change. */
  dq: number;
  /** Market win-prob change. */
  dp: number;
}

/**
 * OLS of dp on dq: returns { alpha, beta }. beta < 1 (significant) is the
 * under-updating finding; beta ~= 0 with drift rho > 0 is pure drift.
 */
export function updatingRegression(pairs: readonly UpdatePair[]): { alpha: number; beta: number } {
  if (pairs.length < 2) throw new Error("updatingRegression: need >= 2 pairs");
  const n = pairs.length;
  const mq = pairs.reduce((s, p) => s + p.dq, 0) / n;
  const mp = pairs.reduce((s, p) => s + p.dp, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (const p of pairs) {
    sxy += (p.dq - mq) * (p.dp - mp);
    sxx += (p.dq - mq) ** 2;
  }
  if (sxx < 1e-12) throw new Error("updatingRegression: no benchmark variation");
  const beta = sxy / sxx;
  return { alpha: mp - beta * mq, beta };
}

/**
 * Drift-follow signal: follow only when a soft book lags the sharp book by
 * more than the lag threshold (executable stale price).
 */
export function driftFollowSignal(
  softPrice: number,
  sharpPrice: number,
  lagThreshold: number,
  direction: 1 | -1,
): boolean {
  if (lagThreshold <= 0) throw new Error("driftFollowSignal: lagThreshold > 0");
  const gap = direction * (sharpPrice - softPrice);
  return gap > lagThreshold;
}
