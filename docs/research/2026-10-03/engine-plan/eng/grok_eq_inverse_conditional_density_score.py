"""Inverse conditional-density nonconformity score from Li arXiv:2610.37866.

Printed optimal score is s(x, y) = 1 / f(y | x). Smaller preferred.
Fail-closed on non-positive density, non-finite, or None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def inverse_conditional_density_score(conditional_density: float | None) -> float | None:
    """Return 1/f for positive finite density; None otherwise (fail-closed)."""
    try:
        if conditional_density is None:
            return None
        f = float(conditional_density)
        if not math.isfinite(f) or f <= 0.0:
            return None
        return 1.0 / f
    except (TypeError, ValueError, OverflowError):
        return None
