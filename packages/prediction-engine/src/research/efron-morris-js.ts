/**
 * Efron-Morris (1975) section 3 team-level shrinkage estimator for MLB totals.
 *
 * Pre-registered in docs/ops/edge/2026-08-20-prospective-prereg-mlb-totals-js.md
 * section 3 (frozen 2026-08-20, amended 2026-08-21). Pure module: no I/O,
 * no DB, no odds, no NbRbpf import. The q_t^O over-probability is produced
 * by the caller (T-ARM wires run-mve.ts to call nbOverProb here with mu).
 */

/** Anscombe square-root transform: sqrt(x + 3/8). */
export function anscombe(x: number): number {
  return Math.sqrt(x + 3 / 8);
}

/** Back-transform: x = theta_hat^2 - 3/8. */
export function anscombeInverse(theta: number): number {
  return theta * theta - 3 / 8;
}

export const MU_FLOOR = 0.5;
export const DEFAULT_POOLED_VARIANCE = 0.04;
export const MIN_GAMES_FOR_EMPIRICAL = 8;
export const NB2_PHI = 12;

export interface TeamHistory {
  readonly team: string | number;
  readonly n: number;
  readonly transformedMean: number; // mean of anscombe(y_g) over past games
}

export interface EfronMorrisResult {
  readonly team: string | number;
  readonly xI: number;
  readonly dI: number;
  readonly bI: number;
  readonly thetaI: number;
  readonly n: number;
}

/**
 * Compute pooled sample variance of Anscombe-transformed totals across all
 * teams' past games combined. Falls back to DEFAULT_POOLED_VARIANCE when
 * fewer than MIN_GAMES_FOR_EMPIRICAL league-wide past games exist.
 *
 * `s²` is the pooled sample variance of sqrt(y_g + 3/8) across ALL teams'
 * past games combined, up to the current game.
 */
export function pooledVariance(transformedGames: number[], fallback = DEFAULT_POOLED_VARIANCE): number {
  if (transformedGames.length < MIN_GAMES_FOR_EMPIRICAL) return fallback;
  if (transformedGames.length < 2) return fallback;
  const n = transformedGames.length;
  const mean = transformedGames.reduce((a, b) => a + b, 0) / n;
  const sumSq = transformedGames.reduce((a, b) => a + (b - mean) ** 2, 0);
  return sumSq / (n - 1);
}

/**
 * Efron-Morris (1975) section 3 shrinkage estimator.
 *
 * @param teams  Array of teams, each with its own past-game count `n` and
 *               the mean of Anscombe-transformed past totals `transformedMean`.
 * @param s2     Pooled variance (from `pooledVariance`), already fallback-resolved.
 * @returns      Per-team shrinkage results (X_i, D_i, B_i, theta_i).
 *
 * Rules (binding per prereg section 3):
 *   - k = teams with n_i >= 1.
 *   - k < 3  -> every team is unshrunk: theta_i = X_i.
 *   - Xbar = simple unweighted mean of X_i across teams with n_i >= 1.
 *   - A_hat = max(0, (sum(X_i - Xbar)^2 - sum(D_i)) / k).
 *   - B_i = D_i / (A_hat + D_i); if A_hat + D_i == 0, B_i = 1.
 *   - theta_i = Xbar + (1 - B_i)(X_i - Xbar).
 *   - n_i = 0 -> theta_i = Xbar, B_i = 1 (correct degenerate case, NOT a feature imputation).
 */
export function shrinkEfronMorris(
  teams: TeamHistory[],
  s2: number,
): EfronMorrisResult[] {
  const candidates = teams.filter((t) => t.n >= 1);
  const k = candidates.length;

  // Grand mean across teams with n_i >= 1; simple unweighted arithmetic mean.
  const xBar = k > 0
    ? candidates.reduce((sum, t) => sum + t.transformedMean, 0) / k
    : 0;

  if (k < 3) {
    // Below the k>=3 threshold every team is left unshrunk.
    return teams.map((t) => ({
      team: t.team,
      xI: t.n >= 1 ? t.transformedMean : xBar,
      dI: t.n >= 1 ? s2 / t.n : Infinity,
      bI: 1,
      thetaI: t.n >= 1 ? t.transformedMean : xBar,
      n: t.n,
    }));
  }

  // A_hat = max(0, (sum(X_i - Xbar)^2 - sum(D_i)) / k)
  const sumSqDev = candidates.reduce((sum, t) => sum + (t.transformedMean - xBar) ** 2, 0);
  const sumD = candidates.reduce((sum, t) => sum + s2 / t.n, 0);
  const aHat = Math.max(0, (sumSqDev - sumD) / k);

  return teams.map((t) => {
    if (t.n === 0) {
      // Degenerate: no observation to shrink, theta = Xbar, B = 1.
      return {
        team: t.team,
        xI: xBar,
        dI: Infinity,
        bI: 1,
        thetaI: xBar,
        n: 0,
      };
    }

    const dI = s2 / t.n;
    const denom = aHat + dI;
    const bI = denom === 0 ? 1 : dI / denom;
    const thetaI = xBar + (1 - bI) * (t.transformedMean - xBar);

    return {
      team: t.team,
      xI: t.transformedMean,
      dI,
      bI,
      thetaI,
      n: t.n,
    };
  });
}

/**
 * Back-transform the shrunk team values into a per-game mean total.
 *
 * mu = max(MU_FLOOR, ((theta_home + theta_away) / 2)^2 - 3/8)
 *
 * Not exp() — that is only correct for a log transform, which this model does not use.
 */
export function backTransform(thetaHome: number, thetaAway: number): number {
  const thetaAvg = (thetaHome + thetaAway) / 2;
  return Math.max(MU_FLOOR, thetaAvg * thetaAvg - 3 / 8);
}
