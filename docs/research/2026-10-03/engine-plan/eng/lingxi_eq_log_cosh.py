"""Printed log-cosh loss (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not softsign, soft-margin, MAE/MSE/Huber, Hamming, Canberra,
Bray–Curtis, perplexity, or BCE. Does not edit grok_eq_adam.

Standard smooth L1-like regression loss (Keras / common form;
log(cosh x) = log((e^x + e^{-x})/2)):

    L(y, ŷ) = (1/n) Σ_i log(cosh(ŷ_i − y_i))

Caller supplies equal-length numeric vectors.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def _as_finite(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def _log_cosh(z: float) -> float:
    # Stable: for large |z|, log(cosh z) ≈ |z| − log(2)
    az = abs(z)
    if az > 20.0:
        return az - math.log(2.0)
    return math.log(math.cosh(z))


def log_cosh(y: object, yhat: object) -> float | None:
    """L = (1/n) Σ log(cosh(ŷ_i − y_i)).

    Missing / non-finite, length mismatch, or empty → null.
    """
    if not isinstance(y, (list, tuple)) or not isinstance(yhat, (list, tuple)):
        return None
    n = len(y)
    if n == 0 or n != len(yhat):
        return None
    total = 0.0
    for a_raw, b_raw in zip(y, yhat):
        a = _as_finite(a_raw)
        b = _as_finite(b_raw)
        if a is None or b is None:
            return None
        total += _log_cosh(b - a)
    out = total / n
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("log_cosh",)