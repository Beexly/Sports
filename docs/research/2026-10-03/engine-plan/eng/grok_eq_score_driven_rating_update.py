"""Score-driven rating update as printed in Holý and Černý, arXiv:2604.09143 eq (6).

r_{t+1}^{(i)} = r_t^{(i)} + K * ∇_i(r_t; y_t).
Missing inputs or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def score_driven_rating_update(r: float | None, score: float | None, k: float | None) -> float | None:
    if r is None or score is None or k is None:
        return None
    try:
        return float(r) + float(k) * float(score)
    except (ValueError, OverflowError, TypeError):
        return None
