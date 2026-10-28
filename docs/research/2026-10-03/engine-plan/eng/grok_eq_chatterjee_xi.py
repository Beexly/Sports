"""Guarded Chatterjee's rank correlation xi(C) from Siburg arXiv:2610.35340 eq (2).

xi(C) = 6 * integral_0^1 integral_0^1 (partial_1 C(u,v))^2 du dv - 2.

Fail-closed on invalid integral value.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def chatterjee_xi(integral_sq_partial: float | None) -> float | None:
    """Compute xi(C) given the double integral of (partial_1 C)^2.
    
    The integral must be in [0, 0.5] for valid copula (since xi in [0,1]).
    """
    if integral_sq_partial is None:
        return None
    try:
        i = float(integral_sq_partial)
        if not math.isfinite(i) or i < 0.0 or i > 0.5:
            return None
        xi = 6.0 * i - 2.0
        if not (0.0 <= xi <= 1.0):
            return None
        return xi
    except (TypeError, ValueError, OverflowError):
        return None
