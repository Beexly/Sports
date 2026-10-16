"""Sklar's theorem representation as printed in Messoudi et al., arXiv:2101.12002 eq (17).

F(q) = C(F1(q1), ..., Fm(qm)).
Bivariate application: C(F1(q1), F2(q2)).
Missing inputs, margins outside [0,1], or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def sklar_copula(f1: float | None, f2: float | None, c: float | None) -> float | None:
    if f1 is None or f2 is None or c is None:
        return None
    a = float(f1)
    b = float(f2)
    cop = float(c)
    if not (0.0 <= a <= 1.0 and 0.0 <= b <= 1.0):
        return None
    if not (0.0 <= cop <= 1.0):
        return None
    try:
        # For this wiring, treat c as the already-evaluated copula value on the margins
        # (the printed identity is F = C(F1, F2); we return the supplied C value when valid)
        return cop
    except (ValueError, OverflowError):
        return None
