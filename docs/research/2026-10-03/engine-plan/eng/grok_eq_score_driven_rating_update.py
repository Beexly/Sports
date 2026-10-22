"""Guarded score-driven rating update from Holý & Černý arXiv:2604.09143 eq (6).

r_{t+1}^{(i)} = r_t^{(i)} + K * ∇_i (r_t ; y_t)

Missing, non-numeric, negative K, or non-finite fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def score_driven_rating_update(
    rating: float | None,
    k_factor: float | None,
    score_gradient: float | None,
) -> float | None:
    if rating is None or k_factor is None or score_gradient is None:
        return None
    try:
        r = float(rating)
        k = float(k_factor)
        g = float(score_gradient)
        if k <= 0.0 or not all(math.isfinite(v) for v in (r, k, g)):
            return None
        if abs(r) > 1e9 or abs(g) > 1e9:
            return None
        return r + k * g
    except (TypeError, ValueError, OverflowError):
        return None
