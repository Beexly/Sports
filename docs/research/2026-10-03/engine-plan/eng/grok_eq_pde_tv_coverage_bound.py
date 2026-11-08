"""TV-weighted conformal coverage lower bound as printed in Stiller et al., arXiv:2611.08409 eq (2).

P(y_test in C(x_test)) >= 1 - alpha - sum_i w_tilde_i * d_TV(z, z^i)
Returns the lower bound, or None on invalid inputs.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def pde_tv_coverage_lower_bound(alpha: float | None, weighted_tv_sum: float | None) -> float | None:
    if alpha is None or weighted_tv_sum is None:
        return None
    try:
        a = float(alpha)
        s = float(weighted_tv_sum)
    except (TypeError, ValueError):
        return None
    if not (0.0 <= a <= 1.0) or s < 0.0:
        return None
    try:
        bound = 1.0 - a - s
        return bound if bound >= 0.0 else 0.0  # fail closed to non-negative
    except (OverflowError, ValueError):
        return None
