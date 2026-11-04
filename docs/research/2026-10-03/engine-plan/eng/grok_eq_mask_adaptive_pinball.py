"""Guarded alpha-pinball loss from arXiv:2611.01724 eq printed.

ell_alpha(theta, s) = 0.5 * |s - theta| + (0.5 - alpha) * (s - theta)

Missing, non-numeric, non-finite inputs fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def mask_adaptive_pinball(
    alpha: float | None,
    theta: float | None,
    s: float | None,
) -> float | None:
    if any(v is None for v in (alpha, theta, s)):
        return None
    try:
        a = float(alpha)
        th = float(theta)
        ss = float(s)
        if not all(math.isfinite(v) for v in (a, th, ss)):
            return None
        if not (0.0 <= a <= 1.0):
            return None
        if abs(th) > 1e9 or abs(ss) > 1e9:
            return None
        result = 0.5 * abs(ss - th) + (0.5 - a) * (ss - th)
        if not math.isfinite(result):
            return None
        return result
    except (TypeError, ValueError, OverflowError):
        return None
