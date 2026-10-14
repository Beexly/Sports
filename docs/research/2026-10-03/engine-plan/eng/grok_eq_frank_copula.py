"""Frank copula CDF as printed in Hashorva et al., arXiv:1603.01871 §6.3.

Q_alpha(v1, v2) = -1/alpha * ln( 1 + (exp(-alpha*v1)-1)*(exp(-alpha*v2)-1)/(exp(-alpha)-1) ) for alpha != 0.
alpha = 0 is the independence copula (limit).
Missing inputs, u outside (0, 1], or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def frank_copula(u1: float | None, u2: float | None, alpha: float | None) -> float | None:
    if u1 is None or u2 is None or alpha is None:
        return None
    u = float(u1)
    v = float(u2)
    a = float(alpha)
    if not (0.0 < u <= 1.0 and 0.0 < v <= 1.0):
        return None
    if a == 0.0:
        return u * v
    try:
        exp_a = math.exp(-a)
        num = (math.exp(-a * u) - 1.0) * (math.exp(-a * v) - 1.0)
        den = exp_a - 1.0
        if den == 0.0:
            return None
        inner = 1.0 + num / den
        if inner <= 0.0:
            return None
        return -math.log(inner) / a
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
