"""Printed Poisson negative log-likelihood (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not cosine distance (either copy), not Dice/Tversky, not log-cosh.
Does not edit grok_eq_adam.

Poisson PMF p(y|λ)=e^{−λ} λ^y / y!; dropping the y!-constant term
common in ML (PyTorch PoissonNLLLoss full=False style):

    L(y, λ) = (1/n) Σ_i (λ_i − y_i log λ_i)

Caller supplies equal-length non-negative counts y and positive rates λ.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def _as_finite_nonneg(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number) or number < 0.0:
        return None
    return number


def _as_finite_pos(value: object) -> float | None:
    v = _as_finite_nonneg(value)
    if v is None or v <= 0.0:
        return None
    return v


def poisson_nll(y: object, lam: object) -> float | None:
    """L = (1/n) Σ (λ − y log λ).

    Missing / non-finite, y<0, λ≤0, length mismatch, or empty → null.
    """
    if not isinstance(y, (list, tuple)) or not isinstance(lam, (list, tuple)):
        return None
    n = len(y)
    if n == 0 or n != len(lam):
        return None
    total = 0.0
    for y_raw, l_raw in zip(y, lam):
        yi = _as_finite_nonneg(y_raw)
        li = _as_finite_pos(l_raw)
        if yi is None or li is None:
            return None
        total += li - yi * math.log(li)
    out = total / n
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("poisson_nll",)