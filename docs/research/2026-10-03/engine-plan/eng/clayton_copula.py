"""Clayton copula CDF as printed in Pan, Nieto-Barajas, and Craiu, arXiv:2403.12789 §3.

C(u1, u2) = (u1^{-\u03b8} + u2^{-\u03b8} - 1)^{-1/\u03b8} for \u03b8 ≥ -1.
\u03b8 = 0 is the independence copula, as printed in that section.
Missing inputs, u outside (0, 1], \u03b8 < -1, or a non-positive base → null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def clayton_copula(u1: float | None, u2: float | None, theta: float | None) -> float | None:
    if u1 is None or u2 is None or theta is None:
        return None
    u = float(u1)
    v = float(u2)
    th = float(theta)
    if not (0.0 < u <= 1.0 and 0.0 < v <= 1.0):
        return None
    if th < -1.0:
        return None
    if th == 0.0:
        return u * v
    base = u ** (-th) + v ** (-th) - 1.0
    if base <= 0.0:
        return None
    return base ** (-1.0 / th)
