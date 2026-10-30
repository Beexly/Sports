"""Guarded clipped conformal MOS interval from Elelu et al. arXiv:2610.36126 eq (6).

I(x) = [y_hat(x) - q_hat, y_hat(x) + q_hat] ∩ [1, 5].

Fail-closed on non-finite inputs or invalid q_hat.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def conformal_mos_clipped_interval(y_hat: float | None, q_hat: float | None) -> tuple[float, float] | None:
    if y_hat is None or q_hat is None:
        return None
    try:
        y = float(y_hat)
        q = float(q_hat)
        if not (math.isfinite(y) and math.isfinite(q) and q >= 0.0):
            return None
        low = max(1.0, y - q)
        high = min(5.0, y + q)
        if low > high:
            return None
        return (low, high)
    except (TypeError, ValueError, OverflowError):
        return None
