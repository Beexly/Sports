"""Vine copula parameter error stability order as printed in Gelissen & Yuan, arXiv:2610.20037.

Stability bound of order \epsilon^{1/(2d-1)} for parameter tolerance \epsilon in dimension d.
Missing inputs, epsilon <= 0, d < 1, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def vine_copula_stability_order(epsilon: float | None, d: int | None) -> float | None:
    if epsilon is None or d is None:
        return None
    try:
        eps = float(epsilon)
        dim = int(d)
    except (TypeError, ValueError):
        return None
    if eps <= 0.0 or dim < 1:
        return None
    try:
        exponent = 1.0 / (2.0 * dim - 1.0)
        return eps ** exponent
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
