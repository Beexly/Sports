"""Bivariate Khoudraji transform CDF from Craiu & Nieto-Barajas arXiv:2610.28260 eq (2).

C(u, v) = base_copula(u**alpha, v**beta) * (u**(1-alpha)) * (v**(1-beta))

base_copula is supplied as a callable or precomputed value for the powered arguments.
Missing, out-of-range, non-finite, or math failure fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Callable


def khoudraji_bivariate(
    u: float | None,
    v: float | None,
    alpha: float | None,
    beta: float | None,
    base_value: float | None,
) -> float | None:
    if any(x is None for x in (u, v, alpha, beta, base_value)):
        return None
    try:
        uu = float(u)
        vv = float(v)
        aa = float(alpha)
        bb = float(beta)
        bv = float(base_value)
        if not (0.0 < uu <= 1.0 and 0.0 < vv <= 1.0):
            return None
        if not (0.0 <= aa <= 1.0 and 0.0 <= bb <= 1.0):
            return None
        if not math.isfinite(bv) or bv < 0.0 or bv > 1.0:
            return None
        mult = (uu ** (1.0 - aa)) * (vv ** (1.0 - bb))
        res = bv * mult
        if not math.isfinite(res) or res < 0.0 or res > 1.0:
            return None
        return float(res)
    except (TypeError, ValueError, OverflowError, ZeroDivisionError):
        return None
