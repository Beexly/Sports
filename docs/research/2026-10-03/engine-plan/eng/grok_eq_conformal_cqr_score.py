"""Conformalized quantile regression score as printed in arXiv:2411.11824 eq (1.2).

s(x, y) = max{ tau_hat(x, alpha/2) - y, y - tau_hat(x, 1-alpha/2) }
Missing inputs, non-numeric, or non-finite -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def conformal_cqr_score(tau_lo: float | None, tau_hi: float | None, y: float | None) -> float | None:
    if tau_lo is None or tau_hi is None or y is None:
        return None
    try:
        lo = float(tau_lo)
        hi = float(tau_hi)
        yy = float(y)
    except (TypeError, ValueError):
        return None
    if not (lo == lo and hi == hi and yy == yy):
        return None
    try:
        return max(lo - yy, yy - hi)
    except (ValueError, OverflowError):
        return None
