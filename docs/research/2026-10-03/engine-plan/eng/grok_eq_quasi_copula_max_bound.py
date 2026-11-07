"""Quasi-copula max measure bound from Ansari arXiv:2610.30642 eq (2).

G(t) - G(s) <= sum_i (F_i(t) - F_i(s)) for s < t.
Returns the right-hand side sum of increments, or None on invalid.
Missing or nonfinite, or s >= t -> null.
Does not score, mint, or write mind.jsonl.
Source: Jonathan Ansari, Couplings with prescribed maxima,
arXiv:2610.30642v1, https://arxiv.org/html/2610.30642
Opened 2026-11-07. Picks settled stay 0.
Jensen-Shannon 63d5c908 stays held.
"""
from __future__ import annotations

import math
from typing import Any, Sequence


def _finite(x: Any) -> float | None:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v):
        return None
    return v


def quasi_copula_max_bound(s: Any, t: Any, increments: Sequence[Any]) -> float | None:
    """Compute sum of (F_i(t) - F_i(s)) from printed eq (2). Fail closed."""
    ss = _finite(s)
    tt = _finite(t)
    if ss is None or tt is None or ss >= tt:
        return None
    if not increments:
        return None
    total = 0.0
    try:
        for inc in increments:
            di = _finite(inc)
            if di is None:
                return None
            total += di
        if not math.isfinite(total):
            return None
        return total
    except (TypeError, ValueError, OverflowError):
        return None
