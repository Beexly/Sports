"""Guarded online OGD quantile update from Chrétien et al. arXiv:2610.27740 printed eq (4).

θ_{t+1} = max(0, θ_t + η * { (1-α) if R_t > θ_t else -α })

Missing, non-numeric, alpha not in (0,1), eta <=0, residual <0, or theta <0 fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def online_ogd_quantile_update(theta: float | None, eta: float | None, alpha: float | None, residual: float | None) -> float | None:
    if any(v is None or not isinstance(v, (int, float)) for v in (theta, eta, alpha, residual)):
        return None
    try:
        th = float(theta)
        et = float(eta)
        al = float(alpha)
        res = float(residual)
        if th < 0 or et <= 0 or not (0 < al < 1) or res < 0:
            return None
        delta = (1.0 - al) if res > th else -al
        return max(0.0, th + et * delta)
    except (TypeError, ValueError, OverflowError):
        return None
