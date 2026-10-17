"""Galambos (negative logistic) extreme-value copula as printed in standard tables
(e.g. Lopez-Paz 2016 Table 4.1 #14; Galambos 1975).

C_theta(u, v) = u * v * exp( [ (-ln u)^{-theta} + (-ln v)^{-theta} ]^{-1/theta} )
for theta > 0. theta -> 0 yields independence (uv); large theta approaches comonotonicity.

Missing inputs, u/v outside (0, 1], theta <= 0, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def galambos_copula(u: float | None, v: float | None, theta: float | None) -> float | None:
    if u is None or v is None or theta is None:
        return None
    uu = float(u)
    vv = float(v)
    th = float(theta)
    if not (0.0 < uu <= 1.0 and 0.0 < vv <= 1.0):
        return None
    if th <= 0.0:
        return None
    # Boundary: if either is 1, C = the other (or 1)
    if uu == 1.0:
        return vv
    if vv == 1.0:
        return uu
    try:
        a = (-math.log(uu)) ** (-th)
        b = (-math.log(vv)) ** (-th)
        s = a + b
        if s <= 0.0:
            return None
        inner = s ** (-1.0 / th)
        res = uu * vv * math.exp(inner)
        if not (0.0 <= res <= 1.0) or not math.isfinite(res):
            return None
        return res
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
