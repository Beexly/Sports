"""Clayton theta from Kendall tau as printed in Izadimoein et al. arXiv:2611.07716 Table I.

theta = 2 * tau / (1 - tau) for 0 < tau < 1.
Missing, tau outside (0,1), or math failure -> null.
Does not score, mint, or write mind.jsonl.
Source: Ali Izadimoein et al., Copula-Based Dependence Modeling for Resilient 6G Multi-Hop Wireless Networks,
arXiv:2611.07716v1, https://arxiv.org/html/2611.07716v1
Opened 2026-11-07. Picks settled stay 0.
Jensen-Shannon 63d5c908 stays held.
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


def clayton_theta_from_tau(tau: Any) -> float | None:
    """Apply printed theta = 2*tau/(1-tau). Fail closed on invalid."""
    t = _finite(tau)
    if t is None or not (0.0 < t < 1.0):
        return None
    try:
        den = 1.0 - t
        if den <= 0.0:
            return None
        res = 2.0 * t / den
        if not math.isfinite(res) or res <= 0.0:
            return None
        return res
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
