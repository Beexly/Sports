"""Conformal score quantile threshold as printed in Zargarbashi et al., arXiv:2610.24510 eq (1).

q = Q_alpha of empirical with n scores and one infinity point.
Fail-closed on bad inputs. Does not score or write mind.
"""
from __future__ import annotations

import math
from typing import Sequence


def conformal_score_quantile(scores: Sequence[float] | None, alpha: float | None) -> float | None:
    if scores is None or alpha is None:
        return None
    if not (0.0 < alpha < 1.0):
        return None
    try:
        vals = [float(s) for s in scores]
        if not all(math.isfinite(v) for v in vals):
            return None
        n = len(vals)
        if n == 0:
            return None
        # empirical quantile with +infty, level alpha (for the threshold such that coverage ~1-alpha)
        # simple: sort and take the ceil((n+1)*(1-alpha)) th or standard
        sorted_vals = sorted(vals)
        # approximate the Q_alpha of the mixed measure
        k = math.ceil((n + 1) * alpha)
        if k < 1:
            k = 1
        if k > n:
            return float('inf')
        return sorted_vals[k - 1]
    except (TypeError, ValueError, OverflowError):
        return None
