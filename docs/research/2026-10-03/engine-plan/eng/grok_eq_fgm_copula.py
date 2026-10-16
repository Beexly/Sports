"""Farlie-Gumbel-Morgenstern (FGM) copula CDF as printed in Takeuchi arXiv:1004.0439 eq (19)
and Blier-Wong et al. arXiv:2205.11302 eq (1) for d=2.

C(u,v; \theta) = u * v * (1 + \theta * (1-u) * (1-v)), \theta \in [-1, 1].
Missing inputs, u outside (0, 1], \theta outside [-1, 1], or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def fgm_copula(u1: float | None, u2: float | None, theta: float | None) -> float | None:
    if u1 is None or u2 is None or theta is None:
        return None
    u = float(u1)
    v = float(u2)
    th = float(theta)
    if not (0.0 < u <= 1.0 and 0.0 < v <= 1.0):
        return None
    if not (-1.0 <= th <= 1.0):
        return None
    try:
        res = u * v * (1.0 + th * (1.0 - u) * (1.0 - v))
        if not (0.0 <= res <= 1.0) or not math.isfinite(res):
            return None
        return res
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
