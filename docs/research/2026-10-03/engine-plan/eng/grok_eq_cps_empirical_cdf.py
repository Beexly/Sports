"""Guarded CPS empirical predictive CDF from Ye et al. arXiv:2610.38046 eq (2).

Printed: \widehat{F}(y | x) = (1 / N_c) sum_{j=1}^{N_c} 1{A_j(x) <= y}
where A_j are calibration residuals (or scores) for the current x.

Fail-closed on None, empty, non-numeric, non-finite inputs.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def cps_empirical_cdf(
    a_values: Sequence[float] | None,
    y: float | None,
) -> float | None:
    """Return empirical CDF value in [0, 1]; None if invalid."""
    try:
        if a_values is None or y is None:
            return None
        if len(a_values) == 0:
            return None
        yv = float(y)
        if not math.isfinite(yv):
            return None
        count = 0
        for a in a_values:
            if a is None:
                return None
            av = float(a)
            if not math.isfinite(av):
                return None
            if av <= yv:
                count += 1
        return count / len(a_values)
    except (TypeError, ValueError, OverflowError):
        return None
