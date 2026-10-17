"""Bivariate Student-t copula as printed in Pappert, arXiv:2402.01491 eq (21).

C^t_{Sigma, nu}[u, v] = t_{Sigma, nu}(t_nu^{-1}(u), t_nu^{-1}(v)).
Closed forms: independence at rho=0, Frechet bounds at |rho|=1.
Missing inputs, margins outside [0,1], rho outside [-1,1], nu <= 0, or non-closed general case -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def t_copula(u: float | None, v: float | None, rho: float | None, nu: float | None) -> float | None:
    if u is None or v is None or rho is None or nu is None:
        return None
    uu = float(u)
    vv = float(v)
    r = float(rho)
    n = float(nu)
    if not (0.0 <= uu <= 1.0 and 0.0 <= vv <= 1.0):
        return None
    if not (-1.0 <= r <= 1.0):
        return None
    if n <= 0.0:
        return None
    try:
        if r == 1.0:
            return min(uu, vv)
        if r == -1.0:
            return max(uu + vv - 1.0, 0.0)
        if r == 0.0:
            return uu * vv
        # general bivariate t-CDF not elementary without extra libs; fail closed
        return None
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
