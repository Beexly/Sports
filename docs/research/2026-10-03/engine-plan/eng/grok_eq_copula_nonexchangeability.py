"""Guarded pointwise non-exchangeability from Kokol Bukovšek et al. arXiv:2610.16631 Definition 2.1.

|C(u, v) - C(v, u)|

The measure μ_T(C) is the max over the unit square; this is the pointwise contribution.
Missing, non-numeric, or out-of-range fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def copula_nonexchangeability(
    c_uv: float | None,
    c_vu: float | None,
) -> float | None:
    if c_uv is None or c_vu is None:
        return None
    try:
        a = float(c_uv)
        b = float(c_vu)
        if not math.isfinite(a) or not math.isfinite(b):
            return None
        if a < 0 or a > 1 or b < 0 or b > 1:
            return None
        return abs(a - b)
    except (TypeError, ValueError, OverflowError):
        return None
