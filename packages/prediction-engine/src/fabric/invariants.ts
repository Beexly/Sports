/**
 * Mathematical invariant gatekeepers for distributed worker outputs.
 *
 * Mirrors `src/gse_engine/fabric/invariants.py` across TypeScript workers:
 *   - Frechet-Hoeffding bounds for joint copula exceedance
 *   - Row-stochasticity for Markov matrices and Sinkhorn-Knopp transport
 *   - Proper scoring finity and monotonic conformal quantiles
 */

export interface InvariantVerdict {
  readonly ok: boolean;
  readonly reason: string;
  readonly maxViolation: number;
}

function allFinite(values: readonly number[]): boolean {
  for (let i = 0; i < values.length; i += 1) {
    if (!Number.isFinite(values[i]!)) return false;
  }
  return true;
}

export function verifyFrechetHoeffdingBounds(
  marginals: readonly number[],
  jointProb: number,
  tol = 1e-9,
): InvariantVerdict {
  const d = marginals.length;
  if (d === 0) return { ok: false, reason: "empty_marginals", maxViolation: 1 };
  if (!allFinite(marginals) || !Number.isFinite(jointProb)) {
    return { ok: false, reason: "non_finite_copula_probability", maxViolation: Infinity };
  }
  let sum = 0;
  let upper = Infinity;
  for (let i = 0; i < d; i += 1) {
    const p = marginals[i]!;
    if (p < -tol || p > 1 + tol) {
      return { ok: false, reason: "marginal_out_of_unit_interval", maxViolation: 1 };
    }
    sum += p;
    if (p < upper) upper = p;
  }
  const lower = Math.max(sum - (d - 1), 0);
  if (jointProb < lower - tol) {
    return { ok: false, reason: "frechet_hoeffding_lower_violation", maxViolation: lower - jointProb };
  }
  if (jointProb > upper + tol) {
    return { ok: false, reason: "frechet_hoeffding_upper_violation", maxViolation: jointProb - upper };
  }
  return { ok: true, reason: "ok", maxViolation: 0 };
}

export function verifyMarkovRowStochastic(
  matrix: readonly (readonly number[])[],
  tol = 1e-6,
): InvariantVerdict {
  if (matrix.length === 0) return { ok: false, reason: "empty_markov_matrix", maxViolation: 1 };
  const nCols = matrix[0]!.length;
  if (nCols === 0) return { ok: false, reason: "empty_markov_columns", maxViolation: 1 };

  let maxErr = 0;
  for (let r = 0; r < matrix.length; r += 1) {
    const row = matrix[r]!;
    if (row.length !== nCols) {
      return { ok: false, reason: "ragged_markov_matrix", maxViolation: 1 };
    }
    if (!allFinite(row)) {
      return { ok: false, reason: "non_finite_markov_entry", maxViolation: Infinity };
    }
    let rowSum = 0;
    for (let c = 0; c < row.length; c += 1) {
      const v = row[c]!;
      if (v < -1e-12) {
        return { ok: false, reason: "negative_transition_prob", maxViolation: Math.abs(v) };
      }
      rowSum += v;
    }
    const rowErr = Math.abs(rowSum - 1);
    if (rowErr > maxErr) maxErr = rowErr;
    if (rowErr > tol) {
      return { ok: false, reason: "markov_row_sum_drift", maxViolation: rowErr };
    }
  }
  return { ok: true, reason: "ok", maxViolation: maxErr };
}

export function verifySinkhornMarginals(
  plan: readonly (readonly number[])[],
  rowTarget: readonly number[],
  colTarget: readonly number[],
  tol = 1e-6,
): InvariantVerdict {
  const nRows = rowTarget.length;
  const nCols = colTarget.length;
  if (nRows === 0 || nCols === 0 || plan.length !== nRows) {
    return { ok: false, reason: "sinkhorn_shape_mismatch", maxViolation: 1 };
  }
  if (!allFinite(rowTarget) || !allFinite(colTarget)) {
    return { ok: false, reason: "non_finite_sinkhorn_targets", maxViolation: Infinity };
  }

  const colSums = new Array<number>(nCols).fill(0);
  let maxErr = 0;
  for (let i = 0; i < nRows; i += 1) {
    const row = plan[i]!;
    if (row.length !== nCols) return { ok: false, reason: "sinkhorn_ragged_plan", maxViolation: 1 };
    if (!allFinite(row)) return { ok: false, reason: "non_finite_sinkhorn_cell", maxViolation: Infinity };
    let rSum = 0;
    for (let j = 0; j < nCols; j += 1) {
      const v = row[j]!;
      if (v < -1e-12) {
        return { ok: false, reason: "negative_transport_mass", maxViolation: Math.abs(v) };
      }
      rSum += v;
      colSums[j] = (colSums[j] ?? 0) + v;
    }
    const rErr = Math.abs(rSum - rowTarget[i]!);
    if (rErr > maxErr) maxErr = rErr;
    if (rErr > tol) {
      return { ok: false, reason: "sinkhorn_row_marginal_drift", maxViolation: rErr };
    }
  }

  for (let j = 0; j < nCols; j += 1) {
    const cErr = Math.abs(colSums[j]! - colTarget[j]!);
    if (cErr > maxErr) maxErr = cErr;
    if (cErr > tol) {
      return { ok: false, reason: "sinkhorn_col_marginal_drift", maxViolation: cErr };
    }
  }
  return { ok: true, reason: "ok", maxViolation: maxErr };
}

export function verifyProperScoringAndConformal(
  scoreVal: number,
  quantiles: readonly number[],
): InvariantVerdict {
  if (!Number.isFinite(scoreVal)) {
    return { ok: false, reason: "non_finite_proper_score", maxViolation: Infinity };
  }
  if (scoreVal < -1e-12) {
    return { ok: false, reason: "negative_proper_score", maxViolation: Math.abs(scoreVal) };
  }
  if (quantiles.length === 0 || !allFinite(quantiles)) {
    return { ok: false, reason: "non_finite_conformal_quantiles", maxViolation: Infinity };
  }
  for (let i = 0; i < quantiles.length - 1; i += 1) {
    if (quantiles[i]! > quantiles[i + 1]! + 1e-12) {
      return {
        ok: false,
        reason: "conformal_quantile_crossing",
        maxViolation: quantiles[i]! - quantiles[i + 1]!,
      };
    }
  }
  return { ok: true, reason: "ok", maxViolation: 0 };
}
