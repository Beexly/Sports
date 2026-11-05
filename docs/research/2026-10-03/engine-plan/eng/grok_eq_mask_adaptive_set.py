"""Mask-adaptive prediction set membership as printed in arXiv:2611.01724.

C_hat(X) = {y in Y : S(X, y) <= q(X)}.
Returns 1 if score <= q, 0 if score > q, None on invalid input.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def mask_adaptive_set(score: float | None, q: float | None) -> int | None:
    if score is None or q is None:
        return None
    if not isinstance(score, (int, float)) or not isinstance(q, (int, float)):
        return None
    try:
        s_f = float(score)
        q_f = float(q)
    except (TypeError, ValueError):
        return None
    if s_f != s_f or q_f != q_f:  # NaN
        return None
    return 1 if s_f <= q_f else 0
