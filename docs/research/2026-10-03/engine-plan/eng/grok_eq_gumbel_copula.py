"""Gumbel copula CDF as printed in standard references (Gumbel 1960; Hougaard 1986).

C_alpha(u1, u2) = exp( - ( (-ln u1)^alpha + (-ln u2)^alpha )^{1/alpha} ) for alpha >= 1.
alpha = 1 is the independence copula.
Missing inputs, u outside (0, 1], alpha < 1, or non-positive base under the root -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def gumbel_copula(u1: float | None, u2: float | None, alpha: float | None) -> float | None:
    if u1 is None or u2 is None or alpha is None:
        return None
    u = float(u1)
    v = float(u2)
    a = float(alpha)
    if not (0.0 < u <= 1.0 and 0.0 < v <= 1.0):
        return None
    if a < 1.0:
        return None
    if a == 1.0:
        return u * v
    # Avoid log(0)
    if u <= 0.0 or v <= 0.0:
        return None
    try:
        term1 = (-math.log(u)) ** a
        term2 = (-math.log(v)) ** a
        base = term1 + term2
        if base <= 0.0:
            return None
        return math.exp(-(base ** (1.0 / a)))
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
