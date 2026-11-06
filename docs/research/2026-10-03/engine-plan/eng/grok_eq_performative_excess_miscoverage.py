"""Performative excess miscoverage as printed in arXiv:2611.05277 Definition 2.4.

ExMisc(C_f, P) = max{0, P(Y notin C_f(X)) - alpha}
Returns the excess or None on invalid input.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def performative_excess_miscoverage(
    miscoverage: float | None,
    alpha: float | None,
) -> float | None:
    if miscoverage is None or alpha is None:
        return None
    try:
        m = float(miscoverage)
        a = float(alpha)
        if not (math.isfinite(m) and math.isfinite(a)):
            return None
        if not (0.0 <= m <= 1.0 and 0.0 < a < 1.0):
            return None
        return max(0.0, m - a)
    except (TypeError, ValueError, OverflowError):
        return None
