"""Score-driven rating update as printed in Holý and Černý, arXiv:2604.09143 eq (6).

r_{t+1}^{(i)} = r_t^{(i)} + K \nabla_i(r_t; y_t).
Missing inputs, K <= 0, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def score_driven_rating_update(r: float | None, k: float | None, score: float | None) -> float | None:
    if r is None or k is None or score is None:
        return None
    try:
        rr = float(r)
        kk = float(k)
        ss = float(score)
        if kk <= 0.0:
            return None
        return rr + kk * ss
    except (ValueError, OverflowError, TypeError):
        return None
