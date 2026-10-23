"""Guarded vine copula density from Schulz et al. arXiv:2610.23119 eq (1).

c(u) = product over trees and edges of the pair-copula densities.

Missing, non-numeric, or non-positive fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def vine_copula_density(pair_densities: Sequence[float] | None) -> float | None:
    if pair_densities is None:
        return None
    try:
        vals = [float(v) for v in pair_densities]
        if not vals:
            return None
        if any(not math.isfinite(v) or v <= 0.0 for v in vals):
            return None
        prod = 1.0
        for v in vals:
            prod *= v
            if not math.isfinite(prod) or prod <= 0.0:
                return None
        return prod
    except (TypeError, ValueError, OverflowError):
        return None
