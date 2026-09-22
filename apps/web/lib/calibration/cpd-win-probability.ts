/**
 * Conformal Predictive Distributions (CPD) win-probability head —
 * arXiv 2208.08598 ("Using Conformal Win Probability to Predict the Winners
 * of the Cancelled 2020 NCAA Basketball Tournaments").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes
 * published probabilities and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: fit y_uvw = mu_w + theta_uw - theta_vw + epsilon on
 * rolling trailing windows via OLS with team strengths re-fit weekly; for
 * each upcoming game build pi(y_c, 1/2) over a grid of candidate MOV values
 * using signed residuals; moneyline prob = 1 - pi(0, 1/2); spread-cover
 * prob at line s = pi(-s, 1/2). Per-game evaluation is table lookup +
 * interpolation on the precomputed residual CDF; the Eq. 3 recursion serves
 * fixed-bracket contest pricing. Extension beyond the paper: time-decayed
 * weighted least squares (recency weighting) and locally-weighted
 * conformity scores.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT into the engine iff on
 * 2021-2024 walk-forward its log-loss is >=1% better than the logistic
 * baseline AND its low-probability calibration (predicted 0.05-0.35 bucket)
 * has |observed - predicted| <= 0.03 in every bucket.
 */

export interface GameMov {
  readonly home: string;
  readonly away: string;
  /** Home margin of victory (negative = away won). */
  readonly mov: number;
  /** Recency weight (1 = unweighted OLS; <1 discounts old games). */
  readonly weight?: number;
}

export interface StrengthFit {
  readonly mu: number;
  readonly theta: Readonly<Record<string, number>>;
}

/**
 * OLS (optionally time-decayed WLS) team strengths: mov = mu + theta_h -
 * theta_a. Solved via normal equations with sum-to-zero constraint
 * (reference coding: last team's theta = -sum of the rest).
 */
export function fitStrengths(
  games: readonly GameMov[],
  decayPerWeek?: (weeksAgo: number) => number,
  weeksAgo?: readonly number[],
): StrengthFit {
  const teamSet = new Set<string>();
  for (const g of games) {
    teamSet.add(g.home);
    teamSet.add(g.away);
  }
  const teams = [...teamSet];
  const k = teams.length;
  if (k === 0 || games.length === 0) return { mu: 0, theta: {} };
  const idx = new Map(teams.map((t, i) => [t, i]));
  // Variables: [mu, theta_0 .. theta_{k-2}]; theta_{k-1} = -sum(rest).
  const p = k; // mu + (k-1) free thetas
  const A: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const b: number[] = new Array<number>(p).fill(0);
  for (let gi = 0; gi < games.length; gi++) {
    const g = games[gi]!;
    let w = g.weight ?? 1;
    if (decayPerWeek && weeksAgo) w *= decayPerWeek(weeksAgo[gi] ?? 0);
    const hi = idx.get(g.home)!;
    const ai = idx.get(g.away)!;
    const row = new Array<number>(p).fill(0);
    row[0] = 1;
    const hVar = hi < k - 1 ? hi + 1 : -1;
    const aVar = ai < k - 1 ? ai + 1 : -1;
    // theta_{k-1} = -sum_{j<k-1} theta_j: home +1 on hVar, away -1 on aVar.
    for (let j = 1; j < p; j++) {
      let c = 0;
      if (hVar === -1) c -= 1;
      else if (hVar === j) c += 1;
      if (aVar === -1) c += 1;
      else if (aVar === j) c -= 1;
      row[j] = c;
    }
    for (let r = 0; r < p; r++) {
      for (let c = 0; c < p; c++) A[r]![c]! += w * row[r]! * row[c]!;
      b[r]! += w * row[r]! * g.mov;
    }
  }
  const sol = solveLinear(A, b);
  const theta: Record<string, number> = {};
  let restSum = 0;
  for (let j = 1; j < p; j++) {
    theta[teams[j - 1]!] = sol[j]!;
    restSum += sol[j]!;
  }
  theta[teams[k - 1]!] = -restSum;
  return { mu: sol[0]!, theta };
}

/** Gaussian elimination with partial pivoting. Returns zeros on singularity. */
export function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r]![col]!) > Math.abs(M[piv]![col]!)) piv = r;
    }
    if (Math.abs(M[piv]![col]!) < 1e-12) return new Array<number>(n).fill(0);
    [M[col], M[piv]] = [M[piv]!, M[col]!];
    const div = M[col]![col]!;
    for (let c = col; c <= n; c++) M[col]![c]! /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r]![col]!;
      for (let c = col; c <= n; c++) M[r]![c]! -= f * M[col]![c]!;
    }
  }
  return M.map((row) => row[n]!);
}

/** Signed residuals: mov - (mu + theta_h - theta_a). */
export function signedResiduals(
  games: readonly GameMov[],
  fit: StrengthFit,
): number[] {
  return games.map(
    (g) => g.mov - (fit.mu + (fit.theta[g.home] ?? 0) - (fit.theta[g.away] ?? 0)),
  );
}

/**
 * CPD CDF pi(y_c): empirical P(residual <= y_c - expectedMov) by table
 * lookup + linear interpolation on the sorted residual grid.
 */
export function cpdCdf(
  sortedResiduals: readonly number[],
  expectedMov: number,
  y: number,
): number {
  const n = sortedResiduals.length;
  if (n === 0) return Number.NaN;
  const t = y - expectedMov;
  if (t < sortedResiduals[0]!) return 0;
  if (t >= sortedResiduals[n - 1]!) return 1;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (sortedResiduals[mid]! <= t) lo = mid;
    else hi = mid;
  }
  const r0 = sortedResiduals[lo]!;
  const r1 = sortedResiduals[hi]!;
  const frac = r1 === r0 ? 0 : (t - r0) / (r1 - r0);
  // Hazen plotting positions: F(x_i) = (i + 0.5)/n, linear between knots.
  // Symmetric about the median (pick'em moneyline = 0.5 on symmetric grids).
  return (lo + 0.5 + frac) / n;
}

/** Moneyline prob (home win) = 1 - pi(0, 1/2). */
export function cpdMoneylineProb(
  sortedResiduals: readonly number[],
  expectedMov: number,
): number {
  const pi0 = cpdCdf(sortedResiduals, expectedMov, 0);
  return Number.isNaN(pi0) ? Number.NaN : 1 - pi0;
}

/**
 * Spread-cover prob at line s (home视角): pi(-s, 1/2) per the paper.
 * s > 0 means the home team is favored by s.
 */
export function cpdSpreadCoverProb(
  sortedResiduals: readonly number[],
  expectedMov: number,
  s: number,
): number {
  return cpdCdf(sortedResiduals, expectedMov, -s);
}

/** Expected MOV for a matchup under a strength fit. */
export function expectedMov(
  fit: StrengthFit,
  home: string,
  away: string,
): number {
  return fit.mu + (fit.theta[home] ?? 0) - (fit.theta[away] ?? 0);
}
