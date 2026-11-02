"""FRA1 upper tail dependence coefficient as printed in Hua arXiv:2609.18742.

lambda_U(theta) = max{2 - 2**(1 - theta), 0} for theta in [-1, 1).
Invalid inputs or math failure -> None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def fra1_upper_tail_dependence(theta: float | None) -> float | None:
    if theta is None:
        return None
    try:
        th = float(theta)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(th) or not (-1.0 <= th < 1.0):
        return None
    try:
        val = 2.0 - (2.0 ** (1.0 - th))
        res = max(val, 0.0)
        if not math.isfinite(res):
            return None
        return res
    except (OverflowError, ValueError):
        return None
