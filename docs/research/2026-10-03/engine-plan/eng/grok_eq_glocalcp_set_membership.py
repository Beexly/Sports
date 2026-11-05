"""GLocalCP set membership as printed in Xu et al arXiv:2611.04066 eq (10).

C_n(z_n) membership: (s(z_n, y) / r_n) <= q_n + g_n(z_n).
Missing inputs, non-numeric, r <= 0, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def glocalcp_set_membership(
    s: float | None,
    r: float | None,
    q: float | None,
    g: float | None,
) -> bool | None:
    if s is None or r is None or q is None or g is None:
        return None
    try:
        ss = float(s)
        rr = float(r)
        qq = float(q)
        gg = float(g)
        if not (rr > 0.0):
            return None
        if not (math_isfinite(ss) and math_isfinite(rr) and math_isfinite(qq) and math_isfinite(gg)):
            return None
        return (ss / rr) <= (qq + gg)
    except (TypeError, ValueError, ZeroDivisionError, OverflowError):
        return None


def math_isfinite(x: float) -> bool:
    return x == x and abs(x) != float("inf")
