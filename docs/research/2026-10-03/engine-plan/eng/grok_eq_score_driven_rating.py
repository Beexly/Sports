"""Score-driven rating update as printed in Holý & Černý arXiv:2604.09143 eq (6).

r_{t+1}^{(i)} = r_t^{(i)} + K * nabla_i(r_t; y_t) for i=1..n
Missing inputs, non-numeric, length mismatch, K<=0, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

from typing import Sequence


def score_driven_rating_update(
    ratings: Sequence[float] | None,
    gradients: Sequence[float] | None,
    k: float | None,
) -> list[float] | None:
    if ratings is None or gradients is None or k is None:
        return None
    try:
        rs = [float(x) for x in ratings]
        gs = [float(x) for x in gradients]
        kk = float(k)
        if not rs or len(rs) != len(gs) or not (kk > 0.0):
            return None
        return [r + kk * g for r, g in zip(rs, gs)]
    except (TypeError, ValueError, OverflowError):
        return None
