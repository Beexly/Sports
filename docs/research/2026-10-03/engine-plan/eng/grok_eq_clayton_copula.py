"""Clayton copula CDF as printed in Webb, arXiv:1310.4456 Figure 2.3.

C(u1,...,un) = (sum_{i=1}^n u_i^{-theta} - n + 1)^{-1/theta} for theta > 0.
Bivariate form: (u^{-theta} + v^{-theta} - 1)^{-1/theta}.
Missing inputs, u outside (0, 1], theta <= 0, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def clayton_copula(u1: float | None, u2: float | None, theta: float | None) -> float | None:
    if u1 is None or u2 is None or theta is None:
        return None
    u = float(u1)
    v = float(u2)
    th = float(theta)
    if not (0.0 < u <= 1.0 and 0.0 < v <= 1.0):
        return None
    if th <= 0.0:
        return None
    try:
        term = u ** (-th) + v ** (-th) - 1.0
        if term <= 0.0:
            return None
        return term ** (-1.0 / th)
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
