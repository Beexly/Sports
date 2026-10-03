"""Score-driven rating step as printed by Holy and Cerny. No pick. Never main.

r_{t+1}^{(i)} = r_t^{(i)} + K * nabla_i(r_t; y_t), for i = 1, ..., n
K > 0. nabla_i is the score partial ln f(y_t | r_t) / partial r_t^{(i)}.

Source: Vladimir Holy and Michal Cerny, Score-Driven Rating System for Sports,
arXiv:2604.09143v1, eq. (6) and eq. (7),
https://arxiv.org/html/2604.09143v1
Opened 2026-10-03. Scores are supplied. This is not a pick.
Jensen-Shannon 63d5c908 stays held. Picks settled stay 0.
"""
from __future__ import annotations

import math
from typing import Any, Sequence


def _finite(x: Any) -> float | None:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v):
        return None
    return v


def score_driven_rating_step(
    ratings: Sequence[Any],
    scores: Sequence[Any],
    k: Any,
) -> list[float] | None:
    """Apply printed eq. (6). Fail closed on K <= 0, non-finite, or length mismatch."""
    k_val = _finite(k)
    if k_val is None or k_val <= 0.0:
        return None
    if len(ratings) != len(scores) or len(ratings) == 0:
        return None
    out: list[float] = []
    for rating, score in zip(ratings, scores):
        r = _finite(rating)
        g = _finite(score)
        if r is None or g is None:
            return None
        out.append(r + k_val * g)
    return out


FUNCTIONS = {"score_driven_rating_step": score_driven_rating_step}
PICKS_SETTLED = 0
