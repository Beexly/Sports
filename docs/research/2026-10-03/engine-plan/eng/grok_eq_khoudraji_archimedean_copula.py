"""Khoudraji-transformed Archimedean copula as printed in Craiu & Nieto-Barajas, arXiv:2610.28260 eq (2).

C_theta,alpha(u) = psi_inv(psi(u1^alpha1) + ... ) * prod uj^(1-alphaj).
Bivariate form. Missing inputs, u outside (0,1], alpha outside [0,1], invalid generator, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Callable


def khoudraji_archimedean_copula(
    u1: float | None,
    u2: float | None,
    alpha1: float | None,
    alpha2: float | None,
    phi: Callable[[float], float] | None,
    phi_inv: Callable[[float], float] | None,
) -> float | None:
    if any(x is None for x in (u1, u2, alpha1, alpha2, phi, phi_inv)):
        return None
    u = float(u1)
    v = float(u2)
    a1 = float(alpha1)
    a2 = float(alpha2)
    if not (0.0 < u <= 1.0 and 0.0 < v <= 1.0):
        return None
    if not (0.0 <= a1 <= 1.0 and 0.0 <= a2 <= 1.0):
        return None
    try:
        # power terms; guard 0^0-ish but u>0
        ua = u ** a1
        va = v ** a2
        s = phi(ua) + phi(va)
        arch = phi_inv(s)
        if not math.isfinite(arch) or not (0.0 <= arch <= 1.0):
            return None
        prod = (u ** (1.0 - a1)) * (v ** (1.0 - a2))
        if not math.isfinite(prod) or not (0.0 <= prod <= 1.0):
            return None
        res = arch * prod
        if not math.isfinite(res) or not (0.0 <= res <= 1.0):
            return None
        return res
    except (ValueError, OverflowError, ZeroDivisionError, TypeError, ArithmeticError):
        return None
