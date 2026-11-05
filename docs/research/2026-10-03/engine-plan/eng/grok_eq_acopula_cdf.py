"""Archimedean copula CDF as printed in arXiv:2605.23134 eq (2).

C(u) = psi( sum_j psi^{-1}(u_j) ) for u in [0,1]^d.
Bivariate form. Missing inputs, u outside (0,1], invalid generator, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Callable


def acopula_cdf(u1: float | None, u2: float | None, psi: Callable[[float], float] | None, psi_inv: Callable[[float], float] | None) -> float | None:
    if u1 is None or u2 is None or psi is None or psi_inv is None:
        return None
    u = float(u1)
    v = float(u2)
    if not (0.0 < u <= 1.0 and 0.0 < v <= 1.0):
        return None
    try:
        s = psi_inv(u) + psi_inv(v)
        res = psi(s)
        if not math.isfinite(res) or not (0.0 <= res <= 1.0):
            return None
        return res
    except (ValueError, OverflowError, ZeroDivisionError, TypeError):
        return None
