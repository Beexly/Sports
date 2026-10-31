"""Guarded convergence time from Dey & Marchetti arXiv:2610.28285 printed eq (2).

T(ε) := min {k ∈ ℕ : d_k ≤ ε * d_0 }

Returns the smallest k where the inequality holds, or None if never or invalid.
Fail-closed on missing, non-finite, non-positive ε, empty sequence, non-positive d_0.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def convergence_time_min(
    d: Sequence[float] | None,
    epsilon: float | None,
) -> int | None:
    if d is None or epsilon is None:
        return None
    try:
        eps = float(epsilon)
        if not math.isfinite(eps) or eps <= 0.0:
            return None
        ds = [float(v) for v in d]
        if not ds or not all(math.isfinite(v) for v in ds):
            return None
        d0 = ds[0]
        if d0 <= 0.0:
            return None
        thresh = eps * d0
        for k, dk in enumerate(ds):
            if dk <= thresh:
                return k
        return None
    except (TypeError, ValueError, OverflowError):
        return None
