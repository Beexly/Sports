"""Split conformal marginal coverage bounds as printed in Angelopoulos & Bates arXiv:2107.07511 eq (1).

1 - alpha <= P(Y_test in C(X_test)) <= 1 - alpha + 1/(n+1)
for alpha in (0,1), n positive integer.
Missing inputs, alpha outside (0,1), n < 1, or math failure -> None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def conformal_coverage_bounds(alpha: float | None, n: int | None) -> tuple[float, float] | None:
    if alpha is None or n is None:
        return None
    a = float(alpha)
    nn = int(n)
    if not (0.0 < a < 1.0) or not math.isfinite(a):
        return None
    if nn < 1:
        return None
    try:
        lower = 1.0 - a
        upper = lower + 1.0 / (nn + 1)
        if not (math.isfinite(lower) and math.isfinite(upper) and lower <= upper <= 1.0 + 1e-9):
            return None
        return (lower, upper)
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
