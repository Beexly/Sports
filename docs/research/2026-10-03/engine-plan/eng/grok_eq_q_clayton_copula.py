"""q-dimensional Clayton copula CDF as printed in Izadimoein et al., arXiv:2611.07716 eq (15).

C_theta^Cl (u) = (sum_{i=1}^q u_i^{-theta} - q + 1 )^{-1/theta} for theta > 0.
Missing inputs, any u outside (0, 1], theta <= 0, q < 1, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def q_clayton_copula(us: Sequence[float | None] | None, theta: float | None) -> float | None:
    if us is None or theta is None:
        return None
    try:
        u_list = [float(u) for u in us]
    except (TypeError, ValueError):
        return None
    q = len(u_list)
    if q < 1:
        return None
    th = float(theta)
    if th <= 0.0:
        return None
    for u in u_list:
        if not (0.0 < u <= 1.0):
            return None
    try:
        s = sum(u ** (-th) for u in u_list) - q + 1.0
        if s <= 0.0:
            return None
        return s ** (-1.0 / th)
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
