"""Score-driven rating update as printed in Holý & Černý arXiv:2604.09143 eq (6).

r_{t+1}^{(i)} = r_t^{(i)} + K * \nabla_i (r_t ; y_t)
where \nabla_i is the score (partial of log density).
Missing inputs, non-finite, K <= 0, or math failure -> None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def score_driven_rating_update(r: float | None, k: float | None, score: float | None) -> float | None:
    if r is None or k is None or score is None:
        return None
    try:
        r_f = float(r)
        k_f = float(k)
        s_f = float(score)
        if k_f <= 0.0:
            return None
        if not (abs(r_f) < 1e12 and abs(s_f) < 1e12):
            return None
        return r_f + k_f * s_f
    except (TypeError, ValueError, OverflowError):
        return None
