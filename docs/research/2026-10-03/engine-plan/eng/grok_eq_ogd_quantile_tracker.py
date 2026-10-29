"""Guarded online gradient-descent quantile tracker from Chretien et al. arXiv:2610.27740 printed eq (4).

theta_{t+1} = max(0, theta_t + eta * { (1-alpha) if R_t > theta_t else -alpha })

Fail-closed on invalid inputs: missing, non-finite, non-positive eta or alpha out of (0,1), negative residuals.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def ogd_quantile_tracker(
    theta: float | None,
    eta: float | None,
    alpha: float | None,
    residual: float | None,
) -> float | None:
    if theta is None or eta is None or alpha is None or residual is None:
        return None
    try:
        th = float(theta)
        et = float(eta)
        al = float(alpha)
        res = float(residual)
        if not (math.isfinite(th) and math.isfinite(et) and math.isfinite(al) and math.isfinite(res)):
            return None
        if et <= 0.0 or not (0.0 < al < 1.0) or res < 0.0 or th < 0.0:
            return None
        delta = (1.0 - al) if res > th else -al
        next_th = th + et * delta
        return max(0.0, next_th)
    except (TypeError, ValueError, OverflowError):
        return None
