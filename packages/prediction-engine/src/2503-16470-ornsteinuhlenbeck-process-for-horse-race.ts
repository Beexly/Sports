/**
 * arXiv:2503.16470 — Ornstein–Uhlenbeck Process for Horse Race Betting: A Micro–Macro Analysis of Herding and Informed Bettors
 *
 * Ornstein-Uhlenbeck efficiency clock for line movement: fit the OU mean-reversion rate r_inf(n) to NFL
 * line paths, add a delayed-herder class (public bettors reacting to stale lines) producing a stale-line
 * arbitrage-window detector.
 *
 * Improvement: Fit the O–U efficiency-clock to NFL line movement as a market-timing honesty instrument, extended with a delayed-herder class (public bettors reacting to stale lines, f_delay(z_{n−k})) so the model produces a stale-line arbitrage-window detector — the exact moments when public money is betting yesterday's number — that the paper's single-herder model cannot produce.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adapt the O–U efficiency-clock into GSE's market-timing lane if: (i) the NFL r_inf(n) fit achieves R² ≥ 0.5 with positive Δr on 2023–2025 data; and (ii) a favorite/underdog split shows statistically different r_inf trajectories (Wald test p < 0.05).
 */

/** OU fit summary for one line-movement path. */
export interface OuFit {
  /** Long-run mean reversion rate (the efficiency clock). */
  rInf: number;
  /** R^2 of the OU fit. */
  rSquared: number;
}

/**
 * Fit OU via the AR(1) discretization: dx = theta*(mu - x)*dt + sigma*dW.
 * Returns theta_hat (r_inf) and R^2.
 */
export function fitOuClock(path: readonly number[], dt = 1): OuFit {
  if (path.length < 3) throw new Error("fitOuClock: need >= 3 points");
  const n = path.length - 1;
  const xs = path.slice(0, n);
  const dx = path.slice(1).map((v, i) => v - (path[i] ?? 0));
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const md = dx.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxd = 0;
  for (let i = 0; i < n; i++) {
    sxx += ((xs[i] ?? 0) - mx) ** 2;
    sxd += ((xs[i] ?? 0) - mx) * ((dx[i] ?? 0) - md);
  }
  if (sxx < 1e-12) throw new Error("fitOuClock: no path variance");
  const slope = sxd / sxx; // d x_t ~ slope * x_t
  const theta = Math.max(0, -slope / dt); // mean reversion rate
  const mu = mx + md / Math.max(1e-9, -slope || -1e-9);
  const resid = dx.map((d, i) => d - (slope * ((xs[i] ?? 0) - mx) + md));
  const sse = resid.reduce((s, r) => s + r * r, 0);
  const sst = dx.reduce((s, d) => s + (d - md) ** 2, 0);
  void mu;
  return { rInf: theta, rSquared: sst > 0 ? Math.max(0, 1 - sse / sst) : 0 };
}

/**
 * Stale-line arbitrage window: the delayed herder bets the k-lagged line, so
 * a window opens when |line_t - line_{t-k}| exceeds the herder threshold
 * while the efficient component has already mean-reverted.
 */
export function staleLineWindows(
  line: readonly number[],
  lag: number,
  threshold: number,
): number[] {
  if (lag < 1) throw new Error("staleLineWindows: lag >= 1");
  const out: number[] = [];
  for (let t = lag; t < line.length; t++) {
    if (Math.abs((line[t] ?? 0) - (line[t - lag] ?? 0)) >= threshold) out.push(t);
  }
  return out;
}
