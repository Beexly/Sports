"""Guarded score-driven rating update from arXiv:2604.09143 printed eq (6)-(7).

r_{t+1}^{(i)} = r_t^{(i)} + K * nabla_i(r_t; y_t)
where nabla_i = partial ln f(y | r) / partial r_i

For binary win/loss logistic Elo special case: nabla = y - sigmoid(diff/400*log(10))
Missing, non-numeric, non-finite, invalid K or ratings fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def score_driven_rating_update(
    rating: float | None,
    outcome: float | None,
    opponent_rating: float | None,
    k_factor: float | None = 16.0,
) -> float | None:
    if rating is None or outcome is None or opponent_rating is None or k_factor is None:
        return None
    try:
        r = float(rating)
        y = float(outcome)
        ro = float(opponent_rating)
        k = float(k_factor)
        if not all(math.isfinite(v) for v in (r, y, ro, k)):
            return None
        if y not in (0.0, 1.0):
            return None
        if k <= 0.0 or k > 100.0:
            return None
        if abs(r) > 1e6 or abs(ro) > 1e6:
            return None
        # Elo expected score: 1 / (1 + 10**(-(r - ro)/400))
        expected = 1.0 / (1.0 + 10.0 ** (-(r - ro) / 400.0))
        if not math.isfinite(expected):
            return None
        delta = k * (y - expected)
        new_rating = r + delta
        if not math.isfinite(new_rating) or abs(new_rating) > 1e6:
            return None
        return new_rating
    except (TypeError, ValueError, OverflowError, ZeroDivisionError):
        return None
