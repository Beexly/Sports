"""Inverse conditional-density score as printed in Li, arXiv:2610.37866.

s(x, y) = 1 / f(y | x) where f is the conditional density of the response.
Missing inputs, non-positive density, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def inverse_conditional_density_score(f: float | None) -> float | None:
    if f is None:
        return None
    try:
        density = float(f)
    except (TypeError, ValueError):
        return None
    if not (density > 0.0):
        return None
    try:
        return 1.0 / density
    except (ZeroDivisionError, OverflowError):
        return None
