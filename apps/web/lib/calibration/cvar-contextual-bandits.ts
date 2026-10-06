/**
 * CVaR contextual bandits for pick selection — arXiv 2507.15320v5
 * ("Risk-Sensitive Contextual Bandits...").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes the
 * published slate and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: contextual bandit where each arm (pick category) has a
 * conditional reward distribution modeled by quantile regression on game
 * context (spread bucket, total bucket, rest differential, weather bucket,
 * December flag); the decision criterion is CVaR_tau of the conditional
 * reward, computed by integrating the predicted quantile function over
 * [0, tau]; optimistic action selection adds a context-dependent bonus.
 * Model training stays offline; this module is the serving-time math:
 * CVaR-from-quantiles, per-tau linear quantile serving, and optimistic
 * CVaR action selection.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT iff on the 2022-2025
 * walk-forward the CVaR-contextual policy beats the context-free CVaR
 * bandit on realized CVaR_0.25(weekly profit) by >=10% relative at
 * >=90% of the mean profit.
 */

/**
 * CVaR_tau from a predicted quantile function: (1/tau) * integral_0^tau
 * Q(u) du, via trapezoidal integration over the tau grid restricted to
 * [0, tau].
 */
export function cvarFromQuantiles(
  tauGrid: readonly number[],
  quantiles: readonly number[],
  tau: number,
): number {
  const t = Math.min(Math.max(tau, 1e-9), 1);
  const n = tauGrid.length;
  if (n === 0 || quantiles.length !== n) return Number.NaN;
  // Build the clipped grid: anchor at u = 0, grid points in (0, t], plus t.
  const us: number[] = [0];
  const qs: number[] = [interpolateQuantile(tauGrid, quantiles, 0)];
  for (let i = 0; i < n; i++) {
    if (tauGrid[i]! <= 0) continue;
    if (tauGrid[i]! <= t) {
      us.push(tauGrid[i]!);
      qs.push(quantiles[i]!);
    } else break;
  }
  // Interpolate Q(t) at the boundary.
  const qAtT = interpolateQuantile(tauGrid, quantiles, t);
  us.push(t);
  qs.push(qAtT);
  let integral = 0;
  for (let i = 1; i < us.length; i++) {
    integral += ((qs[i - 1]! + qs[i]!) / 2) * (us[i]! - us[i - 1]!);
  }
  return integral / t;
}

/** Linear interpolation of the quantile function at level u. */
export function interpolateQuantile(
  tauGrid: readonly number[],
  quantiles: readonly number[],
  u: number,
): number {
  const n = tauGrid.length;
  if (n === 0) return Number.NaN;
  if (u <= tauGrid[0]!) return quantiles[0]!;
  if (u >= tauGrid[n - 1]!) return quantiles[n - 1]!;
  for (let i = 0; i < n - 1; i++) {
    if (u >= tauGrid[i]! && u <= tauGrid[i + 1]!) {
      const w = (u - tauGrid[i]!) / (tauGrid[i + 1]! - tauGrid[i]!);
      return quantiles[i]! + w * (quantiles[i + 1]! - quantiles[i]!);
    }
  }
  return quantiles[n - 1]!;
}

/**
 * Per-tau linear quantile model serving: Q_tau(x) = intercept[tau] +
 * coefs[tau] . features. Coefficients fit offline.
 */
export function linearQuantileModel(
  intercepts: readonly number[],
  coefRows: ReadonlyArray<readonly number[]>,
  features: readonly number[],
  tauIndex: number,
): number {
  if (tauIndex < 0 || tauIndex >= intercepts.length) return Number.NaN;
  let s = intercepts[tauIndex]!;
  const coefs = coefRows[tauIndex] ?? [];
  for (let i = 0; i < features.length && i < coefs.length; i++) {
    s += features[i]! * coefs[i]!;
  }
  return s;
}

/**
 * Optimistic CVaR action selection: pick the arm maximizing
 * CVaR_tau(arm | context) + bonus(arm). Returns the arm index.
 */
export function optimisticCvarAction(
  cvars: readonly number[],
  bonuses: readonly number[],
): number {
  if (cvars.length === 0) return -1;
  let best = 0;
  let bestScore = cvars[0]! + (bonuses[0] ?? 0);
  for (let i = 1; i < cvars.length; i++) {
    const s = cvars[i]! + (bonuses[i] ?? 0);
    if (s > bestScore) {
      bestScore = s;
      best = i;
    }
  }
  return best;
}

/** Discrete CVaR of realized samples (lower tail). */
export function discreteCvar(samples: readonly number[], tau: number): number {
  const t = Math.min(Math.max(tau, 0), 1);
  if (samples.length === 0) return 0;
  const s = [...samples].sort((a, b) => a - b);
  const k = Math.max(1, Math.ceil(t * s.length));
  let sum = 0;
  for (let i = 0; i < k; i++) sum += s[i]!;
  return sum / k;
}
