"""Gumbel copula CDF as printed in MetricGate Gumbel Copula docs.

C(u, v) = exp( - [ (-ln u)^theta + (-ln v)^theta ]^{1/theta} ) for theta >= 1.
Missing inputs, u,v outside (0, 1], theta < 1, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def gumbel_copula(u1: float | None, u2: float | None, theta: float | None) -> float | None:
    if u1 is None or u2 is None or theta is None:
        return None
    u = float(u1)
    v = float(u2)
    th = float(theta)
    if not (0.0 < u <= 1.0 and 0.0 < v <= 1.0):
        return None
    if th < 1.0:
        return None
    try:
        ln_u = -math.log(u)
        ln_v = -math.log(v)
        inner = (ln_u ** th + ln_v ** th) ** (1.0 / th)
        return math.exp(-inner)
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
