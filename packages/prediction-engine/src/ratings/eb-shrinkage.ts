/**
 * Empirical-Bayes shrinkage for pairwise-comparison ratings.
 *
 * Research source: arXiv:1807.09236 — "Improving Pairwise Comparison Models
 * Using Empirical Bayes Shrinkage".
 *
 * A pure post-processing wrapper: after each ratings update (Elo/BTL-style),
 * form R_hat = (I + A S)^{-1} with S = N * I_hat (N games, I_hat the expected
 * Fisher information from the season's matchup graph) and publish
 *   gamma_hat_SHR = (I - R_hat) gamma_hat_MLE + R_hat u
 * with u the league-average rating. Zero change to the rating model itself.
 * The diagonal of the information matrix flags high-variance pairs
 * (early-season inter-conference games with weak graph edges) for wider
 * published intervals / reduced stake sizing. The schedule-aware extension:
 * because the NFL schedule is known in advance, the expected Fisher
 * information can be computed from the not-yet-played future matchup graph,
 * shrinking toward minimum expected future-prediction variance.
 *
 * ACCEPTANCE GATE: adopt as a permanent post-processing step iff shrunk
 * ratings beat unshrunk on rest-of-season Brier score in >= 2 of 3 test
 * seasons (2023-2025) with no calibration degradation (ECE within 0.003),
 * replicating the paper's -5% to -9% matchup-level gains; reject if gains
 * vanish once margin-of-victory and home-field features are included.
 * Either way, keep the Fisher-information uncertainty diagnostic.
 *
 * Additive research module — not wired into any live prediction path.
 */

export interface ShrinkageInput {
  /** MLE team ratings keyed by team. */
  mle: Record<string, number>;
  /**
   * Expected Fisher information per team: sum over the team's games of the
   * per-game information (e.g. p(1-p) for a logistic/BTL outcome model).
   * Higher = more data behind the rating.
   */
  information: Record<string, number>;
  /** Total games informing the ratings (the paper's N). */
  totalGames: number;
  /** Shrinkage strength A (tuned on held-out data; paper uses small A). */
  strength?: number;
  /** Shrinkage target (league average); defaults to the MLE mean. */
  target?: number;
}

export interface ShrinkageResult {
  /** Shrunk ratings. */
  shrunk: Record<string, number>;
  /** Per-team shrinkage factor in [0, 1]: 1 = fully shrunk to target. */
  factors: Record<string, number>;
  /** Effective target used. */
  target: number;
}

/**
 * Diagonal-Fisher closed form of the paper's estimator. With diagonal
 * S = N * diag(information), R_hat_ii = 1 / (1 + A * N * info_i) and
 * shrunk_i = (1 - R_ii) * mle_i + R_ii * u. Teams with little information
 * shrink hardest — exactly the early-season inter-conference case.
 */
export function shrinkRatings(input: ShrinkageInput): ShrinkageResult {
  const teams = Object.keys(input.mle);
  if (teams.length === 0) throw new Error("shrinkRatings: no teams");
  const A = input.strength ?? 1;
  const N = Math.max(1, input.totalGames);
  const target =
    input.target ?? teams.reduce((a, t) => a + (input.mle[t] ?? 0), 0) / teams.length;
  const shrunk: Record<string, number> = {};
  const factors: Record<string, number> = {};
  for (const t of teams) {
    const info = Math.max(0, input.information[t] ?? 0);
    const r = 1 / (1 + A * N * info);
    factors[t] = r;
    shrunk[t] = (1 - r) * (input.mle[t] ?? 0) + r * target;
  }
  return { shrunk, factors, target };
}

/**
 * Full-matrix form: R_hat = (I + A S)^{-1} with an arbitrary symmetric
 * positive-definite S (e.g. the dense Fisher matrix when game outcomes
 * correlate across teams). Falls back to the diagonal form when S is
 * diagonal. S is given as a nested record keyed by team pairs.
 */
export function shrinkRatingsMatrix(
  mle: Record<string, number>,
  fisher: Record<string, Record<string, number>>,
  totalGames: number,
  strength = 1,
  target?: number,
): ShrinkageResult {
  const teams = Object.keys(mle).sort();
  const n = teams.length;
  if (n === 0) throw new Error("shrinkRatingsMatrix: no teams");
  const u =
    target ?? teams.reduce((a, t) => a + (mle[t] ?? 0), 0) / n;
  const N = Math.max(1, totalGames);
  // M = I + A * N * S
  const M: number[][] = Array.from({ length: n }, (_, i) => {
    const ti = teams[i] as string;
    return Array.from({ length: n }, (_, j) => {
      const s = fisher[ti]?.[teams[j] as string] ?? 0;
      return (i === j ? 1 : 0) + strength * N * s;
    });
  });
  const R = invert(M);
  const shrunk: Record<string, number> = {};
  const factors: Record<string, number> = {};
  teams.forEach((t, i) => {
    const Ri = R[i] as number[];
    let val = 0;
    teams.forEach((s2, j) => {
      const rij = Ri[j] ?? 0;
      val += (i === j ? 1 : 0) * (mle[t] ?? 0) - rij * ((mle[s2] ?? 0) - u);
    });
    shrunk[t] = val;
    factors[t] = Math.min(1, Math.max(0, Ri[i] ?? 0));
  });
  return { shrunk, factors, target: u };
}

/** Matrix inverse by Gauss-Jordan elimination. */
function invert(A: number[][]): number[][] {
  const n = A.length;
  const M: number[][] = A.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);
  const row = (i: number): number[] => M[i] as number[];
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(row(r)[col] ?? 0) > Math.abs(row(piv)[col] ?? 0)) piv = r;
    }
    if (Math.abs(row(piv)[col] ?? 0) < 1e-12) throw new Error("invert: singular matrix");
    const tmp = M[col] as number[];
    M[col] = M[piv] as number[];
    M[piv] = tmp;
    const d = row(col)[col] ?? 0;
    for (let c = 0; c < 2 * n; c++) row(col)[c] = (row(col)[c] ?? 0) / d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = row(r)[col] ?? 0;
      for (let c = 0; c < 2 * n; c++) row(r)[c] = (row(r)[c] ?? 0) - f * (row(col)[c] ?? 0);
    }
  }
  return M.map((r) => r.slice(n));
}

/**
 * Uncertainty diagnostic: per-team posterior variance proxy
 * diag(R_hat) / (A * N). Larger = less trustworthy rating — widen
 * published intervals / reduce stake sizing there.
 */
export function shrinkageUncertainty(result: ShrinkageResult): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of Object.keys(result.factors)) {
    out[t] = result.factors[t] ?? 0;
  }
  return out;
}
