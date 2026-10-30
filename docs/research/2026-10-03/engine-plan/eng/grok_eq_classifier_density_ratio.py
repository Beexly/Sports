"""Classifier density ratio as printed in Huk et al., arXiv:2411.03014 eq (2).

r(x) = h*(x) / (1 - h*(x)) where h* is the Bayes optimal classifier probability.
Missing inputs, h outside (0, 1), or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def classifier_density_ratio(h: float | None) -> float | None:
    if h is None:
        return None
    try:
        p = float(h)
    except (TypeError, ValueError):
        return None
    if not (0.0 < p < 1.0):
        return None
    try:
        return p / (1.0 - p)
    except (ZeroDivisionError, OverflowError):
        return None
