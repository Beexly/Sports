"""Split conformal quantile index from CoCoNet arXiv:2610.24246 eq (3).

k = ceil((n_cal + 1) * (1 - alpha))

Missing, non-positive, non-finite, out-of-range alpha, or math failure fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def conformal_split_quantile_index(
    n_cal: int | None,
    alpha: float | None,
) -> int | None:
    if n_cal is None or alpha is None:
        return None
    try:
        nn = int(n_cal)
        aa = float(alpha)
        if nn < 1 or not math.isfinite(aa) or not (0.0 < aa < 1.0):
            return None
        k = math.ceil((nn + 1) * (1.0 - aa))
        if not (1 <= k <= nn):
            return None
        return int(k)
    except (TypeError, ValueError, OverflowError):
        return None
