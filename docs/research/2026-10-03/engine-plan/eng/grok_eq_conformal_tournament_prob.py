"""Tournament win probability recursion as printed in Johnstone & Nettleton 2022 (arXiv:2208.08598), eq (3).

q_uJ = q_u,J-1 * sum_{s in O_uJ} (p_us * q_s,J-1)

Guarded: missing inputs, empty opponent set, non-prob inputs -> None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations
from typing import Sequence


def conformal_tournament_prob_step(
    q_prev_u: float | None,
    p_us: Sequence[float | None] | None,
    q_prev_s: Sequence[float | None] | None,
) -> float | None:
    if q_prev_u is None or p_us is None or q_prev_s is None:
        return None
    if len(p_us) != len(q_prev_s) or len(p_us) == 0:
        return None
    try:
        qu = float(q_prev_u)
        if not (0.0 <= qu <= 1.0):
            return None
        total = 0.0
        for p, qs in zip(p_us, q_prev_s):
            if p is None or qs is None:
                return None
            pf = float(p)
            qsf = float(qs)
            if not (0.0 <= pf <= 1.0 and 0.0 <= qsf <= 1.0):
                return None
            total += pf * qsf
        return qu * total
    except (TypeError, ValueError, OverflowError):
        return None
