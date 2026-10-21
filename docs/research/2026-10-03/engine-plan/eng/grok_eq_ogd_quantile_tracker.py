"""Guarded online gradient descent quantile tracker from Chrétien et al. arXiv:2610.27740 eq (4).

theta_{t+1} = max(0, theta_t + eta * ((1-alpha) if R_t > theta_t else -alpha))

Missing, non-numeric, negative eta/alpha, or invalid fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def ogd_quantile_tracker(
    theta: float | None,
    residual: float | None,
    alpha: float | None,
    eta: float | None,
) -> float | None:
    if theta is None or residual is None or alpha is None or eta is None:
        return None
    try:
        th = float(theta)
        r = float(residual)
        a = float(alpha)
        e = float(eta)
        if not (0.0 < a < 1.0) or e <= 0.0 or th < 0.0:
            return None
        delta = (1.0 - a) if r > th else -a
        return float(max(0.0, th + e * delta))
    except (TypeError, ValueError, OverflowError):
        return None
