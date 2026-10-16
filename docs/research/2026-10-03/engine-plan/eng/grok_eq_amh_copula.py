"""Ali-Mikhail-Haq (AMH) copula CDF as printed in Pougaza arXiv:0812.1316 §3.2.4 / (2.19).

C_α(u1,u2) = (u1 * u2) / (1 - α*(1-u1)*(1-u2)), α ∈ [-1, 1).
Missing inputs, u outside (0, 1], α outside [-1, 1), or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def amh_copula(u1: float | None, u2: float | None, alpha: float | None) -> float | None:
    if u1 is None or u2 is None or alpha is None:
        return None
    u = float(u1)
    v = float(u2)
    a = float(alpha)
    if not (0.0 < u <= 1.0 and 0.0 < v <= 1.0):
        return None
    if not (-1.0 <= a < 1.0):
        return None
    try:
        denom = 1.0 - a * (1.0 - u) * (1.0 - v)
        if denom <= 0.0 or not math.isfinite(denom):
            return None
        res = (u * v) / denom
        if not (0.0 <= res <= 1.0) or not math.isfinite(res):
            return None
        return res
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
