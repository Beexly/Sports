"""Archimedean copula CDF as printed in Messoudi et al., arXiv:2101.12002 eq (19).

C(u1,...,um) = phi^{[-1]}(phi(u1) + ... + phi(um)).
Bivariate form requires generator phi and its inverse phi_inv.
Missing inputs, u outside (0,1], invalid generator, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Callable


def archimedean_copula(u1: float | None, u2: float | None, phi: Callable[[float], float] | None, phi_inv: Callable[[float], float] | None) -> float | None:
    if u1 is None or u2 is None or phi is None or phi_inv is None:
        return None
    u = float(u1)
    v = float(u2)
    if not (0.0 < u <= 1.0 and 0.0 < v <= 1.0):
        return None
    try:
        s = phi(u) + phi(v)
        res = phi_inv(s)
        if not math.isfinite(res) or not (0.0 <= res <= 1.0):
            return None
        return res
    except (ValueError, OverflowError, ZeroDivisionError, TypeError):
        return None
