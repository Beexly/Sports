"""ACRC w_+ calibrator as printed in Qiao et al arXiv:2611.01053 eq (6).

w_+(l) = min{1, a(l)} where a(l) = A * int_0^1 prod_i (1 - t * l_i) dt,
A = alpha * (n + 1), n = len(l).
Missing inputs, non-numeric, empty, alpha not in (0,1), or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def acrc_w_plus(
    losses: Sequence[float] | None,
    alpha: float | None,
) -> float | None:
    if losses is None or alpha is None:
        return None
    try:
        ls = [float(x) for x in losses]
        a = float(alpha)
        if not ls or not (0.0 < a < 1.0):
            return None
        if any(not (0.0 <= x <= 1.0) for x in ls):
            return None
        n = len(ls)
        A = a * (n + 1)
        # numerical integral of prod (1 - t * l_i)
        steps = 1000
        dt = 1.0 / steps
        integral = 0.0
        for i in range(steps):
            t = (i + 0.5) * dt
            prod = 1.0
            for li in ls:
                prod *= (1.0 - t * li)
            integral += prod * dt
        aval = A * integral
        return min(1.0, aval)
    except (TypeError, ValueError, OverflowError):
        return None
