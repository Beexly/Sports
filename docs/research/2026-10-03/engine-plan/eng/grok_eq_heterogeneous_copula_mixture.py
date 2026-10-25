"""Guarded heterogeneous copula mixture density from arXiv:2610.08317 printed eq (1).

q_η(u) = sum_{k=1}^K w_k * c_θk(u)

Missing, non-numeric, non-finite, negative weights, or weights not summing to 1 fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def heterogeneous_copula_mixture(
    weights: Sequence[float] | None,
    component_densities: Sequence[float] | None,
) -> float | None:
    if weights is None or component_densities is None:
        return None
    if len(weights) == 0 or len(weights) != len(component_densities):
        return None
    try:
        ws = [float(w) for w in weights]
        cs = [float(c) for c in component_densities]
        if not all(math.isfinite(v) for v in ws + cs):
            return None
        if any(w < 0.0 for w in ws):
            return None
        if any(c < 0.0 for c in cs):
            return None
        if abs(sum(ws) - 1.0) > 1e-6:
            return None
        if any(abs(v) > 1e9 for v in ws + cs):
            return None
        result = sum(w * c for w, c in zip(ws, cs))
        if not math.isfinite(result) or result < 0.0:
            return None
        return result
    except (TypeError, ValueError, OverflowError):
        return None
