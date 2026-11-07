"""Symmetrized Blest coefficient eta from arXiv:2611.08026.

Printed eq (1):
eta(C) = 12 * int_0^1 int_0^1 (2 - u - v) * C(u,v) du dv - 2
Numerical trapezoidal approximation. Missing or invalid inputs, or math failure -> null.
Does not score, mint, or write mind.jsonl.
Source: Marcus Rockel, Exact regions for the symmetrized Blest coefficient,
arXiv:2611.08026v1, https://arxiv.org/html/2611.08026v1
Opened 2026-11-07. Picks settled stay 0.
Jensen-Shannon 63d5c908 stays held.
"""
from __future__ import annotations

import math
from typing import Any, Callable

import numpy as np


def _finite(x: Any) -> float | None:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v):
        return None
    return v


def symmetrized_blest_eta(
    copula: Callable[[np.ndarray, np.ndarray], np.ndarray] | None,
    n: Any = 200,
) -> float | None:
    """Apply printed eta(C) via numerical double integral. Fail closed on invalid."""
    if not callable(copula):
        return None
    fn = _finite(n)
    if fn is None or fn < 10 or fn > 1000:
        return None
    n_int = int(fn)
    try:
        u = np.linspace(0.0, 1.0, n_int)
        v = np.linspace(0.0, 1.0, n_int)
        U, V = np.meshgrid(u, v, indexing="ij")
        C = copula(U, V)
        if not isinstance(C, np.ndarray) or C.shape != (n_int, n_int):
            return None
        if not np.all(np.isfinite(C)) or np.any(C < -1e-8) or np.any(C > 1.0 + 1e-8):
            return None
        weight = 2.0 - U - V
        integral = np.trapezoid(np.trapezoid(weight * C, v, axis=1), u)
        if not math.isfinite(integral):
            return None
        res = 12.0 * integral - 2.0
        if not math.isfinite(res) or res < -1.0 - 1e-6 or res > 1.0 + 1e-6:
            return None
        return float(res)
    except (ValueError, OverflowError, ZeroDivisionError, TypeError):
        return None
