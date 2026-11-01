"""Score-driven rating update from Holý & Černý arXiv:2604.09143 eq (6).

r_{t+1}^{(i)} = r_t^{(i)} + K * nabla_i(r_t; y_t)

Fail-closed on non-finite, non-numeric, or invalid K.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def score_driven_rating_update(
    current_ratings: Sequence[float] | None,
    scores: Sequence[float] | None,
    k_factor: float | None,
) -> list[float] | None:
    """Return updated ratings: r + K * score for each player.

    Inputs must be finite numeric of equal length; K > 0 finite.
    """
    try:
        if current_ratings is None or scores is None or k_factor is None:
            return None
        if len(current_ratings) != len(scores):
            return None
        k = float(k_factor)
        if not math.isfinite(k) or k <= 0:
            return None
        updated = []
        for r, s in zip(current_ratings, scores):
            rr = float(r)
            ss = float(s)
            if not math.isfinite(rr) or not math.isfinite(ss):
                return None
            new_r = rr + k * ss
            if not math.isfinite(new_r):
                return None
            updated.append(new_r)
        return updated
    except (TypeError, ValueError, OverflowError):
        return None
