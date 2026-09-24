/**
 * Distributionally robust CVaR under distribution shift — arXiv 2509.08744
 * ("Distributionally Robust CVaR under Distribution Shift...").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes
 * published risk estimates and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: the P&L distribution shifts between seasons (rule
 * changes, market efficiency drift); instead of the nominal CVaR, use the
 * worst-case CVaR over a KL ambiguity ball {Q : D_KL(Q||P) <= rho} around
 * the empirical distribution. Dual form: robust-CVaR = inf_{lambda >= 0}
 * lambda * (rho + log E_P[exp(L / lambda)]) applied to the tail loss L,
 * computed here by grid search over lambda (offline fitting chooses rho
 * from held-out season pairs; serving evaluates the dual).
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT iff on season-pair
 * backtests (train 2022-2024, test 2025) the robust CVaR bound holds
 * (realized CVaR >= bound) in >=90% of pairs while staying within 1.5x of
 * the nominal CVaR (not vacuous).
 */

/** Discrete KL divergence D_KL(p || q). */
export function klDivergence(p: readonly number[], q: readonly number[]): number {
  let d = 0;
  for (let i = 0; i < p.length && i < q.length; i++) {
    const pi = p[i]!;
    const qi = q[i]!;
    if (pi > 0) {
      if (!(qi > 0)) return Number.POSITIVE_INFINITY;
      d += pi * Math.log(pi / qi);
    }
  }
  return d;
}

/**
 * Exponential-tilting weights: the worst-case distribution in the KL ball
 * shifts mass toward large losses. w_i ∝ exp(loss_i / lambda), normalized.
 */
export function tiltWeights(losses: readonly number[], lambda: number): number[] {
  if (!(lambda > 0) || losses.length === 0) {
    return losses.map(() => 1 / Math.max(losses.length, 1));
  }
  const m = Math.max(...losses);
  const exps = losses.map((l) => Math.exp((l - m) / lambda));
  const s = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / s);
}

/** Weighted lower-tail CVaR under a tilted distribution. */
export function weightedCvar(
  losses: readonly number[],
  weights: readonly number[],
  tau: number,
): number {
  const t = Math.min(Math.max(tau, 0), 1);
  const n = losses.length;
  if (n === 0) return 0;
  if (t <= 0) return Number.NaN; // CVaR_0 is undefined (0/0)
  const order = losses.map((l, i) => i).sort((a, b) => losses[b]! - losses[a]!); // worst first
  let acc = 0;
  let wsum = 0;
  for (const i of order) {
    const w = weights[i] ?? 0;
    if (acc + w >= t || i === order[order.length - 1]) {
      const take = Math.min(w, t - acc);
      wsum += take * losses[i]!;
      break;
    }
    acc += w;
    wsum += w * losses[i]!;
  }
  return wsum / t;
}

/**
 * Robust CVaR under KL ambiguity: sup_{Q : D_KL(Q||P) <= rho} CVaR_tau(Q),
 * approximated by exponential tilting over a lambda grid. The uniform
 * (nominal) distribution always has KL 0 <= rho, so the robust value is
 * >= the nominal CVaR by construction.
 */
export function robustCvarKl(
  losses: readonly number[],
  tau: number,
  rho: number,
  lambdaGrid: readonly number[] = [0.25, 0.5, 1, 2, 5, 10],
): number {
  const n = losses.length;
  if (n === 0) return 0;
  const uniform = losses.map(() => 1 / n);
  let best = weightedCvar(losses, uniform, tau); // nominal fallback
  for (const lambda of lambdaGrid) {
    if (!(lambda > 0)) continue;
    const w = tiltWeights(losses, lambda);
    if (klDivergence(w, uniform) <= rho) {
      best = Math.max(best, weightedCvar(losses, w, tau));
    }
  }
  return best;
}

/** Nominal (non-robust) CVaR of losses for the gate comparison. */
export function nominalCvar(losses: readonly number[], tau: number): number {
  const t = Math.min(Math.max(tau, 0), 1);
  if (losses.length === 0) return 0;
  const s = [...losses].sort((a, b) => b - a); // worst first
  const k = Math.max(1, Math.ceil(t * s.length));
  let sum = 0;
  for (let i = 0; i < k; i++) sum += s[i]!;
  return sum / k;
}
