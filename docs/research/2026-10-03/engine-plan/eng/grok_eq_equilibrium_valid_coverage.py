"""Equilibrium-valid coverage from arXiv:2611.05277.

Printed eq (1):
P_{(X,Y)~D(f*)}(Y in C_{f*}(X)) >= 1 - alpha
Guarded check of the inequality. Missing or invalid inputs, or math failure -> null.
Does not score, mint, or write mind.jsonl.
Source: Ahmed Mahrous, Roberto Di Pietro, Conformal Prediction at Performative Equilibrium,
arXiv:2611.05277v1, https://arxiv.org/html/2611.05277v1
Opened 2026-11-07. Picks settled stay 0.
Jensen-Shannon 63d5c908 stays held.
"""
from __future__ import annotations

import math
from typing import Any


def _finite(x: Any) -> float | None:
    if isinstance(x, bool) or isinstance(x, str):
        return None
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v):
        return None
    return v


def equilibrium_valid_coverage(
    coverage: Any,
    alpha: Any,
) -> bool | None:
    """Return True iff printed inequality holds. Fail closed on invalid."""
    c = _finite(coverage)
    a = _finite(alpha)
    if c is None or a is None:
        return None
    if not (0.0 <= c <= 1.0) or not (0.0 < a < 1.0):
        return None
    try:
        return c >= (1.0 - a)
    except (ValueError, OverflowError):
        return None
