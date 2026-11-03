"""Guarded split CQR interval width from Srivastava & Kassetty arXiv:2611.01512 Remark 1.

Printed: |C(x)| = (q̂_hi(x) − q̂_lo(x)) + 2 Q̂
where Q̂ is the conformal correction (independent of x).

Fail-closed on None, non-numeric, non-finite, inverted quantiles, or negative correction.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def split_cqr_interval_width(
    q_lo: float | None,
    q_hi: float | None,
    q_hat: float | None,
) -> float | None:
    """Return calibrated interval width; None if invalid."""
    try:
        if q_lo is None or q_hi is None or q_hat is None:
            return None
        lo = float(q_lo)
        hi = float(q_hi)
        qh = float(q_hat)
        if not (math.isfinite(lo) and math.isfinite(hi) and math.isfinite(qh)):
            return None
        if lo > hi:
            return None
        if qh < 0.0:
            return None
        return (hi - lo) + 2.0 * qh
    except (TypeError, ValueError, OverflowError):
        return None
