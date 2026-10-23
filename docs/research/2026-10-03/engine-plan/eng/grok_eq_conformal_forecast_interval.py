"""Guarded conformal forecast interval from Wang & Girolimetto arXiv:2610.21648.

\widehat{C}^{\alpha}_{t+h\mid t}=[\widehat{y}_{t+h\mid t}-q^{l}_{t,h},\widehat{y}_{t+h\mid t}+q^{u}_{t,h}]

Missing, non-numeric, or invalid fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def conformal_forecast_interval(
    y_hat: float | None,
    q_l: float | None,
    q_u: float | None,
) -> tuple[float, float] | None:
    if y_hat is None or q_l is None or q_u is None:
        return None
    try:
        y = float(y_hat)
        ql = float(q_l)
        qu = float(q_u)
        if not math.isfinite(y) or not math.isfinite(ql) or not math.isfinite(qu):
            return None
        if ql < 0 or qu < 0:
            return None
        return (y - ql, y + qu)
    except (TypeError, ValueError, OverflowError):
        return None
