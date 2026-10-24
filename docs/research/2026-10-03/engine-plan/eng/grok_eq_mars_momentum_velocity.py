"""Guarded MARS momentum velocity update from Sahu et al. arXiv:2610.21685 eq (28).

v_{i,p} = beta_{i,p} * v_{i,p-1} + (1 - beta_{i,p}) * Delta R^{raw}_{i,p}

Missing, non-numeric, beta not in [0, 1], or invalid fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def mars_momentum_velocity(
    v_prev: float | None,
    beta: float | None,
    delta_r_raw: float | None,
) -> float | None:
    if v_prev is None or beta is None or delta_r_raw is None:
        return None
    try:
        vp = float(v_prev)
        b = float(beta)
        dr = float(delta_r_raw)
        if not (0.0 <= b <= 1.0):
            return None
        return float(b * vp + (1.0 - b) * dr)
    except (TypeError, ValueError, OverflowError):
        return None
