"""L-sensitivity total-variation bound as printed in Mahrous & Di Pietro arXiv:2611.05277 Def 2.2.

TV(D(f), D(g)) <= L * d_F(f, g).
The RHS is the printed upper bound on the total variation.
Missing inputs, non-numeric, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def l_sensitivity_tv_bound(
    L: float | None,
    d: float | None,
) -> float | None:
    if L is None or d is None:
        return None
    try:
        lv = float(L)
        dv = float(d)
        if lv < 0 or dv < 0:
            return None
        return lv * dv
    except (TypeError, ValueError):
        return None
