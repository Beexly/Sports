"""Upper Fréchet-Hoeffding bound (comonotonicity) copula as printed in Müller arXiv:2605.21043 Definition 4.10.2.

M(u, v) = min{u, v}.

Missing inputs, u or v outside [0, 1], or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def frechet_upper_copula(u: float | None, v: float | None) -> float | None:
    if u is None or v is None:
        return None
    uu = float(u)
    vv = float(v)
    if not (0.0 <= uu <= 1.0 and 0.0 <= vv <= 1.0):
        return None
    try:
        res = min(uu, vv)
        if not (0.0 <= res <= 1.0) or not math.isfinite(res):
            return None
        return res
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
