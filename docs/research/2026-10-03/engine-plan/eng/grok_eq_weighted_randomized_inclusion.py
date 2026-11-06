"""Weighted randomized conformal inclusion probability as printed in arXiv:2610.37866 eq (6).

r_s = [ (p * W_x - sum w_i 1{s_i < s}) / (w(x) + sum w_i 1{s_i = s}) ]_0^1
Returns the clipped probability or None on invalid input.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def weighted_randomized_inclusion(
    p: float | None,
    W_x: float | None,
    sum_less: float | None,
    w_x: float | None,
    sum_eq: float | None,
) -> float | None:
    if any(v is None for v in (p, W_x, sum_less, w_x, sum_eq)):
        return None
    try:
        pv = float(p)
        Wx = float(W_x)
        sl = float(sum_less)
        wx = float(w_x)
        se = float(sum_eq)
        if not all(math.isfinite(x) for x in (pv, Wx, sl, wx, se)):
            return None
        if not (0.0 < pv < 1.0 and Wx > 0.0 and wx > 0.0 and sl >= 0.0 and se >= 0.0):
            return None
        denom = wx + se
        if denom <= 0.0:
            return None
        raw = (pv * Wx - sl) / denom
        return max(0.0, min(1.0, raw))
    except (TypeError, ValueError, OverflowError):
        return None
