"""D2D coefficient-level set membership as printed in arXiv:2611.06320.

E(X0) = {a : g(W^{1/2} (theta(f(X0)) - a)) <= q_hat}.
Returns 1 if g_score <= q_hat, 0 otherwise, None on invalid input.
Fail-closed. Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def d2d_coeff_set_membership(g_score: float | None, q_hat: float | None) -> int | None:
    if g_score is None or q_hat is None:
        return None
    if not isinstance(g_score, (int, float)) or not isinstance(q_hat, (int, float)):
        return None
    try:
        gs = float(g_score)
        q = float(q_hat)
    except (TypeError, ValueError):
        return None
    if gs != gs or q != q:  # NaN
        return None
    return 1 if gs <= q else 0
