"""Quasi-copula Lipschitz condition from Ansari arXiv:2610.30642 Theorem 4 (ii).

|Q(u) - Q(v)| <= sum |u_i - v_i| for u, v in [0,1]^d.
Guarded: returns the bound or None on invalid input.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

from typing import Sequence


def quasi_copula_lipschitz_bound(u: Sequence[float] | None, v: Sequence[float] | None) -> float | None:
    if u is None or v is None:
        return None
    try:
        uu = [float(x) for x in u]
        vv = [float(x) for x in v]
        if len(uu) != len(vv) or len(uu) < 1:
            return None
        if any(not (0.0 <= x <= 1.0) for x in uu + vv):
            return None
        return sum(abs(a - b) for a, b in zip(uu, vv))
    except (TypeError, ValueError):
        return None
