"""Disagreement norm as printed in Dey & Marchetti arXiv:2610.28285v1 eq after (1).

d_k := ||x_k - \bar{x}_k 1||
where \bar{x}_k is the mean of the belief vector x_k.
Missing, non-finite, or empty inputs -> None.
Does not score, mint, or write mind.jsonl.
Source: https://arxiv.org/html/2610.28285v1 opened 2026-10-24.
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


def disagreement_norm(x: Sequence[Any] | None) -> float | None:
    """Return Euclidean norm of (x - mean(x) * ones) if all finite and len >= 1, else None."""
    if x is None or not isinstance(x, (list, tuple)) or len(x) == 0:
        return None
    vals: list[float] = []
    for item in x:
        v = _finite(item)
        if v is None:
            return None
        vals.append(v)
    n = len(vals)
    mean = sum(vals) / n
    centered = [v - mean for v in vals]
    try:
        return math.sqrt(sum(c * c for c in centered))
    except (OverflowError, ZeroDivisionError):
        return None
