"""Fisher prediction interval half-width from Shafer & Vovk arXiv:0706.3188 eq (1).

Interval: bar{z} ± t * s * sqrt(n / (n-1))
Fail-closed on non-finite, insufficient length, or zero variance.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def fisher_prediction_halfwidth(
    past_z: Sequence[float] | None,
    t_quantile: float | None,
) -> float | None:
    """Return the half-width of the Fisher prediction interval for the next z.

    past_z must have length >= 2, all finite. t_quantile must be finite positive.
    Returns None on any invalid input (fail-closed).
    """
    try:
        if past_z is None or t_quantile is None:
            return None
        n = len(past_z)
        if n < 2:
            return None
        vals = []
        for z in past_z:
            zz = float(z)
            if not math.isfinite(zz):
                return None
            vals.append(zz)
        mean = sum(vals) / n
        var_sum = sum((z - mean) ** 2 for z in vals)
        if var_sum <= 0:
            return None
        s = math.sqrt(var_sum / (n - 1))  # sample sd with n-1
        t = float(t_quantile)
        if not math.isfinite(t) or t <= 0:
            return None
        factor = math.sqrt(n / (n - 1))
        return t * s * factor
    except (TypeError, ValueError, OverflowError, ZeroDivisionError):
        return None
