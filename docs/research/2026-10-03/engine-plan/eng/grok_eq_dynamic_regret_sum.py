"""Guarded dynamic regret sum from Sahu & Wells arXiv:2610.29982 eq (2).

R_T(pi, mu) := E[ sum_t (max_a mu_{t,a} - mu_{t, A_t}) ]

Computes the realized sum of instantaneous regrets. Missing, non-numeric, length mismatch, or non-finite fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def dynamic_regret_sum(
    mus_max: Sequence[float | None] | None,
    mus_chosen: Sequence[float | None] | None,
) -> float | None:
    if mus_max is None or mus_chosen is None:
        return None
    try:
        if len(mus_max) != len(mus_chosen) or len(mus_max) == 0:
            return None
        total = 0.0
        for mx, ch in zip(mus_max, mus_chosen):
            if mx is None or ch is None:
                return None
            m = float(mx)
            c = float(ch)
            if not math.isfinite(m) or not math.isfinite(c):
                return None
            inst = m - c
            if inst < 0:
                return None
            total += inst
        return total
    except (TypeError, ValueError, OverflowError):
        return None
