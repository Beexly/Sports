"""Guarded intermediate tail order asymptotic from Siburg arXiv:2610.35325 printed eq (1).

C(u w1, u w2) ~ u^κ ℓ(u) b(w1, w2)

RHS = u**kappa * ell_u * b_w

Fail-closed on invalid inputs: missing, non-finite, non-positive u/kappa where required, negative ell or b.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def intermediate_tail_order_rhs(u: float | None, kappa: float | None, ell_u: float | None, b_w: float | None) -> float | None:
    if u is None or kappa is None or ell_u is None or b_w is None:
        return None
    try:
        u_f = float(u)
        k_f = float(kappa)
        e_f = float(ell_u)
        b_f = float(b_w)
        if not (math.isfinite(u_f) and math.isfinite(k_f) and math.isfinite(e_f) and math.isfinite(b_f)):
            return None
        if u_f <= 0 or k_f < 1 or e_f < 0 or b_f < 0:
            return None
        return (u_f ** k_f) * e_f * b_f
    except (TypeError, ValueError, OverflowError):
        return None
