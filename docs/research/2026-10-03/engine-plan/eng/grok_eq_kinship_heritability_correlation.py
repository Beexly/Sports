"""Kinship-scaled heritability correlation entry as printed in Seboka et al. arXiv:2610.27388v1.

Off-diagonal of Gaussian copula correlation matrix v_i: h_{l_j; l_k} * phi^{(i)}_{jk}
where h is the heritability parameter in [0,1] and phi is the kinship coefficient in [0,1].
Missing inputs, values outside [0,1], or non-finite -> None.
Does not score, mint, or write mind.jsonl.
Source: https://arxiv.org/html/2610.27388v1 opened 2026-10-22.
"""
from __future__ import annotations

import math
from typing import Any


def _finite(x: Any) -> float | None:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v):
        return None
    return v


def kinship_heritability_correlation(h: Any, phi: Any) -> float | None:
    """Return h * phi if both in [0, 1], else None."""
    hh = _finite(h)
    pp = _finite(phi)
    if hh is None or pp is None:
        return None
    if not (0.0 <= hh <= 1.0 and 0.0 <= pp <= 1.0):
        return None
    try:
        return hh * pp
    except (OverflowError, ZeroDivisionError):
        return None
