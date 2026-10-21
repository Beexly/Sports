"""Guarded CSPO sequence score from Yang et al. arXiv:2610.25092 eq (2).

S = sum log(r_ell), W = exp(S / L) where L = len(ratios)

Missing, non-positive ratios, empty, or invalid fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations
import math


def cspo_sequence_score(
    token_ratios: list[float] | None,
) -> float | None:
    if token_ratios is None or not isinstance(token_ratios, list) or len(token_ratios) == 0:
        return None
    try:
        logs = []
        for r in token_ratios:
            rr = float(r)
            if rr <= 0.0 or not math.isfinite(rr):
                return None
            logs.append(math.log(rr))
        s = sum(logs)
        l = len(token_ratios)
        return float(math.exp(s / l))
    except (TypeError, ValueError, OverflowError, ZeroDivisionError):
        return None
