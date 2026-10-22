"""Formability difference as printed in Zargarbashi et al. arXiv:2610.24510v1 eq (2)/definition.

Φ_{n,c}(x) = p_{n,c}(c | x) - p_n(c | x)
where p_n is the predictive probability after calibration fit and p_{n,c} after augmented fit on pseudo-label c.
Missing inputs, non-finite, or values outside [0,1] -> None.
Does not score, mint, or write mind.jsonl.
Source: https://arxiv.org/html/2610.24510v1 opened 2026-10-22.
"""
from __future__ import annotations

import math
from typing import Any


def _finite(x: Any) -> float | None:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v):
        return None
    return v


def formability_diff(p_nc: Any, p_n: Any) -> float | None:
    """Return p_nc - p_n if both probabilities in [0, 1], else None."""
    pnc = _finite(p_nc)
    pn = _finite(p_n)
    if pnc is None or pn is None:
        return None
    if not (0.0 <= pnc <= 1.0 and 0.0 <= pn <= 1.0):
        return None
    try:
        return pnc - pn
    except (OverflowError, ZeroDivisionError):
        return None
