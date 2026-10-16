"""Gaussian (bivariate normal) copula as printed in Meyer, arXiv:0912.2816 eq (2.1).

C(u, v, rho) := Phi_2(Phi^{-1}(u), Phi^{-1}(v), rho).
Special closed form at midpoint: C(1/2, 1/2, rho) = 1/4 + (1/(2*pi))*arcsin(rho) from eq (2.10).
Frechet bounds at |rho|=1 and independence at rho=0 also closed.
Missing inputs, margins outside [0,1], rho outside [-1,1], or non-computable case -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def gaussian_copula(u: float | None, v: float | None, rho: float | None) -> float | None:
    if u is None or v is None or rho is None:
        return None
    uu = float(u)
    vv = float(v)
    r = float(rho)
    if not (0.0 <= uu <= 1.0 and 0.0 <= vv <= 1.0):
        return None
    if not (-1.0 <= r <= 1.0):
        return None
    try:
        if r == 1.0:
            return min(uu, vv)
        if r == -1.0:
            return max(uu + vv - 1.0, 0.0)
        if r == 0.0:
            return uu * vv
        if uu == 0.5 and vv == 0.5:
            return 0.25 + (1.0 / (2.0 * math.pi)) * math.asin(r)
        # general bivariate CDF not elementary without extra libs; fail closed
        return None
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
