"""Standardized residual conformal score as printed in Choi, arXiv:2610.34204 eq (12).

s(x, y) = |y - mu_pred(x)| / sqrt(v_pred(x))

Missing inputs, non-positive variance, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def stable_measurement_score(y: float | None, mu: float | None, v: float | None) -> float | None:
    if y is None or mu is None or v is None:
        return None
    try:
        y_f = float(y)
        mu_f = float(mu)
        v_f = float(v)
        if not (math.isfinite(y_f) and math.isfinite(mu_f) and math.isfinite(v_f)):
            return None
        if v_f <= 0.0:
            return None
        return abs(y_f - mu_f) / math.sqrt(v_f)
    except (TypeError, ValueError, OverflowError):
        return None
