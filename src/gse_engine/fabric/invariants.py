"""Mathematical invariant gatekeepers and canary consensus verification.

Enforces zero-tolerance bounds before microtask outputs enter evolutionary
evaluation or champion promotion:
  - Frechet-Hoeffding joint bounds for d-leg SGP copulas
  - Simplex & row-stochasticity for Markov matrices and Sinkhorn transport
  - Proper scoring finity and monotonic conformal quantile bounds
  - Deterministic canonical digesting and Canary dual-dispatch parity
"""

from __future__ import annotations

import hashlib
import json
import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class InvariantVerdict:
    """Result of evaluating hard mathematical invariants on a candidate output."""

    ok: bool
    reason: str
    max_violation: float


def _all_finite(values: Sequence[float]) -> bool:
    return all(isinstance(v, (int, float)) and math.isfinite(float(v)) for v in values)


def verify_frechet_hoeffding_bounds(
    marginals: Sequence[float],
    joint_prob: float,
    tol: float = 1e-9,
) -> InvariantVerdict:
    """Verify max(sum(p_i) - (d - 1), 0) <= C(p_1, ..., p_d) <= min(p_i)."""
    d = len(marginals)
    if d == 0:
        return InvariantVerdict(False, "empty_marginals", 1.0)
    if not _all_finite(marginals) or not math.isfinite(float(joint_prob)):
        return InvariantVerdict(False, "non_finite_copula_probability", float("inf"))

    probs = [float(p) for p in marginals]
    if any(p < -tol or p > 1.0 + tol for p in probs):
        return InvariantVerdict(False, "marginal_out_of_unit_interval", 1.0)

    c_val = float(joint_prob)
    lower = max(sum(probs) - float(d - 1), 0.0)
    upper = min(probs)
    if c_val < lower - tol:
        return InvariantVerdict(False, "frechet_hoeffding_lower_violation", lower - c_val)
    if c_val > upper + tol:
        return InvariantVerdict(False, "frechet_hoeffding_upper_violation", c_val - upper)
    return InvariantVerdict(True, "ok", 0.0)


def verify_markov_row_stochastic(
    matrix: Sequence[Sequence[float]],
    tol: float = 1e-6,
) -> InvariantVerdict:
    """Verify every Markov transition row is non-negative and sums to 1 +/- tol."""
    if not matrix:
        return InvariantVerdict(False, "empty_markov_matrix", 1.0)
    n_cols = len(matrix[0])
    if n_cols == 0:
        return InvariantVerdict(False, "empty_markov_columns", 1.0)

    max_err = 0.0
    for row in matrix:
        if len(row) != n_cols:
            return InvariantVerdict(False, "ragged_markov_matrix", 1.0)
        if not _all_finite(row):
            return InvariantVerdict(False, "non_finite_markov_entry", float("inf"))
        vals = [float(x) for x in row]
        if any(x < -1e-12 for x in vals):
            return InvariantVerdict(False, "negative_transition_prob", abs(min(vals)))
        row_err = abs(sum(vals) - 1.0)
        if row_err > max_err:
            max_err = row_err
        if row_err > tol:
            return InvariantVerdict(False, "markov_row_sum_drift", row_err)
    return InvariantVerdict(True, "ok", max_err)


def verify_sinkhorn_marginals(
    plan: Sequence[Sequence[float]],
    row_target: Sequence[float],
    col_target: Sequence[float],
    tol: float = 1e-6,
) -> InvariantVerdict:
    """Verify transport coupling matrix P >= 0 preserves target marginals within tol."""
    n_rows = len(row_target)
    n_cols = len(col_target)
    if n_rows == 0 or n_cols == 0 or len(plan) != n_rows:
        return InvariantVerdict(False, "sinkhorn_shape_mismatch", 1.0)
    if not _all_finite(row_target) or not _all_finite(col_target):
        return InvariantVerdict(False, "non_finite_sinkhorn_targets", float("inf"))

    col_sums = [0.0] * n_cols
    max_err = 0.0
    for i, row in enumerate(plan):
        if len(row) != n_cols:
            return InvariantVerdict(False, "sinkhorn_ragged_plan", 1.0)
        if not _all_finite(row):
            return InvariantVerdict(False, "non_finite_sinkhorn_cell", float("inf"))
        r_sum = 0.0
        for j, val in enumerate(row):
            v = float(val)
            if v < -1e-12:
                return InvariantVerdict(False, "negative_transport_mass", abs(v))
            r_sum += v
            col_sums[j] += v
        r_err = abs(r_sum - float(row_target[i]))
        max_err = max(max_err, r_err)
        if r_err > tol:
            return InvariantVerdict(False, "sinkhorn_row_marginal_drift", r_err)

    for j, c_sum in enumerate(col_sums):
        c_err = abs(c_sum - float(col_target[j]))
        max_err = max(max_err, c_err)
        if c_err > tol:
            return InvariantVerdict(False, "sinkhorn_col_marginal_drift", c_err)

    return InvariantVerdict(True, "ok", max_err)


def verify_proper_scoring_and_conformal(
    score_val: float,
    quantiles: Sequence[float],
) -> InvariantVerdict:
    """Reject NaN/Inf, negative proper scores, or crossed conformal quantiles."""
    if not isinstance(score_val, (int, float)) or not math.isfinite(float(score_val)):
        return InvariantVerdict(False, "non_finite_proper_score", float("inf"))
    if float(score_val) < -1e-12:
        return InvariantVerdict(False, "negative_proper_score", abs(float(score_val)))
    if not quantiles or not _all_finite(quantiles):
        return InvariantVerdict(False, "non_finite_conformal_quantiles", float("inf"))

    q_floats = [float(q) for q in quantiles]
    for i in range(len(q_floats) - 1):
        if q_floats[i] > q_floats[i + 1] + 1e-12:
            gap = q_floats[i] - q_floats[i + 1]
            return InvariantVerdict(False, "conformal_quantile_crossing", gap)
    return InvariantVerdict(True, "ok", 0.0)


def _walk_finite(obj: Any) -> bool:
    """Recursively reject NaN/Inf in any nested result structure."""
    if isinstance(obj, bool):
        return True
    if isinstance(obj, (int, float)):
        return math.isfinite(float(obj))
    if isinstance(obj, str) or obj is None:
        return True
    if isinstance(obj, Mapping):
        return all(_walk_finite(v) for v in obj.values())
    if isinstance(obj, Sequence):
        return all(_walk_finite(v) for v in obj)
    return False


def verify_microtask_result_invariants(result_payload: Mapping[str, Any]) -> InvariantVerdict:
    """Run all applicable invariant gates over a submitted microtask result dictionary."""
    if not _walk_finite(result_payload):
        return InvariantVerdict(False, "non_finite_payload_value", float("inf"))

    copula_checks = result_payload.get("copula_checks")
    if isinstance(copula_checks, Sequence):
        for chk in copula_checks:
            if not isinstance(chk, Mapping):
                return InvariantVerdict(False, "malformed_copula_check", 1.0)
            v = verify_frechet_hoeffding_bounds(
                chk.get("marginals", []),
                float(chk.get("joint_prob", float("nan"))),
            )
            if not v.ok:
                return v

    markov = result_payload.get("markov_matrix")
    if isinstance(markov, Sequence) and not isinstance(markov, (str, bytes)):
        v = verify_markov_row_stochastic(markov)
        if not v.ok:
            return v

    sinkhorn = result_payload.get("sinkhorn_check")
    if isinstance(sinkhorn, Mapping):
        v = verify_sinkhorn_marginals(
            sinkhorn.get("plan", []),
            sinkhorn.get("row_target", []),
            sinkhorn.get("col_target", []),
        )
        if not v.ok:
            return v

    if "crps" in result_payload or "conformal_quantiles" in result_payload:
        score = float(result_payload.get("crps", 0.0))
        qs = result_payload.get("conformal_quantiles", [0.0, 1.0])
        v = verify_proper_scoring_and_conformal(score, qs)
        if not v.ok:
            return v

    return InvariantVerdict(True, "ok", 0.0)


def _canonicalize_for_digest(obj: Any, decimals: int = 6) -> Any:
    if isinstance(obj, float):
        if not math.isfinite(obj):
            return "NON_FINITE"
        return round(obj, decimals)
    if isinstance(obj, Mapping):
        return {
            str(k): _canonicalize_for_digest(obj[k], decimals)
            for k in sorted(obj.keys())
            if str(k) not in {"node_id", "worker_id", "elapsed_sec", "fencing_token"}
        }
    if isinstance(obj, Sequence) and not isinstance(obj, (str, bytes)):
        return [_canonicalize_for_digest(x, decimals) for x in obj]
    return obj


def compute_result_digest(result_payload: Mapping[str, Any], decimals: int = 6) -> str:
    """Compute canonical SHA-256 digest ignoring worker metadata fields."""
    norm = _canonicalize_for_digest(result_payload, decimals=decimals)
    raw = json.dumps(norm, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def check_canary_parity(
    result_a: Mapping[str, Any],
    result_b: Mapping[str, Any],
    abs_tol: float = 1e-5,
) -> tuple[bool, float, str]:
    """Compare two independent worker outputs on numeric & digest parity."""
    dig_a = compute_result_digest(result_a, decimals=5)
    dig_b = compute_result_digest(result_b, decimals=5)
    if dig_a == dig_b:
        return True, 0.0, "digest_exact"

    max_diff = 0.0
    for key in sorted(set(result_a.keys()) | set(result_b.keys())):
        if key in {"node_id", "worker_id", "elapsed_sec", "fencing_token", "diagnostics"}:
            continue
        va = result_a.get(key)
        vb = result_b.get(key)
        if isinstance(va, (int, float)) and isinstance(vb, (int, float)):
            diff = abs(float(va) - float(vb))
            max_diff = max(max_diff, diff)
            if diff > abs_tol:
                return False, max_diff, f"numeric_divergence:{key}:{diff:.6g}"
        elif va != vb:
            return False, float("inf"), f"structural_divergence:{key}"
    return True, max_diff, "numeric_within_tol"
