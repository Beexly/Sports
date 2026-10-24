"""Online gradient quantile tracker update as printed in arXiv:2610.27740 eq (4).

theta_{t+1} = max(0, theta_t + eta * {(1-alpha) if R > theta, -alpha if R <= theta})

Missing inputs, eta <= 0, alpha not in (0,1), or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def ogd_quantile_update(
    theta: float | None,
    R: float | None,
    eta: float | None,
    alpha: float | None,
) -> float | None:
    """One step of the printed OGD pinball quantile tracker."""
    if theta is None or R is None or eta is None or alpha is None:
        return None
    try:
        th = float(theta)
        r = float(R)
        e = float(eta)
        a = float(alpha)
        if e <= 0.0 or not (0.0 < a < 1.0):
            return None
        if not (math.isfinite(th) and math.isfinite(r) and math.isfinite(e) and math.isfinite(a)):
            return None
        step = (1.0 - a) if r > th else -a
        nxt = max(0.0, th + e * step)
        if not math.isfinite(nxt):
            return None
        return nxt
    except (ValueError, OverflowError, TypeError):
        return None
