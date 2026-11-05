"""GLocalCP prediction set membership as printed in arXiv:2611.04066 eq (10).

C_n(z_n) = { y : s(z_n, y)/r_n <= q_n + g_n(z_n) }.
Returns 1 if s/r <= q + g, 0 otherwise, None on invalid input.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def glocalcp_set_membership(
    s: float | None,
    r: float | None,
    q: float | None,
    g: float | None,
) -> int | None:
    if s is None or r is None or q is None or g is None:
        return None
    if not all(isinstance(x, (int, float)) for x in (s, r, q, g)):
        return None
    try:
        s_f = float(s)
        r_f = float(r)
        q_f = float(q)
        g_f = float(g)
    except (TypeError, ValueError):
        return None
    if any(x != x for x in (s_f, r_f, q_f, g_f)):  # NaN
        return None
    if r_f <= 0:
        return None
    return 1 if (s_f / r_f) <= (q_f + g_f) else 0
