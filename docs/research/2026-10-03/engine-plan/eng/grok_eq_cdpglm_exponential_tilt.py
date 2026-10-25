"""Guarded exponential tilt from CDPGLM arXiv:2610.30467 eq (1).

p_x(y | λ, β) = exp{θ_x y - b(θ_x; λ)} λ(dy)

The exp{θ y - b} factor. Missing, non-numeric, or non-finite fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def cdpglm_exponential_tilt(
    theta: float | None,
    y: float | None,
    b: float | None,
) -> float | None:
    if theta is None or y is None or b is None:
        return None
    try:
        th = float(theta)
        yy = float(y)
        bb = float(b)
        if not all(math.isfinite(v) for v in (th, yy, bb)):
            return None
        if abs(th) > 1e6 or abs(yy) > 1e6 or abs(bb) > 1e6:
            return None
        result = math.exp(th * yy - bb)
        if not math.isfinite(result):
            return None
        return result
    except (TypeError, ValueError, OverflowError):
        return None
