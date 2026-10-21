"""Guarded censoring-compatible reduction from Bladt arXiv:2610.24911 eq (4).

s(x) = min_{1 <= j <= d} psi_j(x^{(j)})

Missing, non-numeric, empty, or length mismatch fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations
from typing import Sequence, Callable


def censoring_compatible_min(
    x: Sequence[float] | None,
    psis: Sequence[Callable[[float], float]] | None,
) -> float | None:
    if x is None or psis is None:
        return None
    try:
        xv = [float(v) for v in x]
        if len(xv) == 0 or len(psis) != len(xv):
            return None
        vals = []
        for j, psi in enumerate(psis):
            if not callable(psi):
                return None
            vals.append(float(psi(xv[j])))
        return float(min(vals))
    except (TypeError, ValueError, OverflowError):
        return None
