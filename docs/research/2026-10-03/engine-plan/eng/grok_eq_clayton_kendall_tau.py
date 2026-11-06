"""Clayton Kendall tau from printed relation in Kızılaslan arXiv:2604.12130 eq. after (2).

tau = theta / (theta + 2) for theta > 0.
Missing or nonpositive theta, or math failure -> null.
Does not score, mint, or write mind.jsonl.
Source: Fatih Kızılaslan, Reliability estimation in dependent stress–strength model with Clayton copula and modified Weibull margins,
arXiv:2604.12130v1, https://arxiv.org/html/2604.12130v1
Opened 2026-11-05. Picks settled stay 0.
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


def clayton_kendall_tau(theta: Any) -> float | None:
    """Apply printed tau = theta / (theta + 2). Fail closed on invalid."""
    th = _finite(theta)
    if th is None or th <= 0.0:
        return None
    try:
        den = th + 2.0
        if den == 0.0:
            return None
        res = th / den
        if not math.isfinite(res) or not (0.0 <= res < 1.0):
            return None
        return res
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
