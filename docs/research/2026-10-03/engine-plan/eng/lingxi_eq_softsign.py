"""Printed softsign activation (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not Hamming, Canberra, Bray–Curtis, Huber, MSE/MAE.
Does not edit grok_eq_adam.

Glorot, X. and Bengio, Y., "Understanding the difficulty of training
deep feedforward neural networks," AISTATS 2010 (softsign listed among
saturating nonlinearities); standard closed form:

    softsign(x) = x / (1 + |x|)

Elementwise over a sequence, or a single scalar.
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


def softsign(x: object) -> float | list[float] | None:
    """softsign(x) = x / (1 + |x|).

    Scalar → float; list/tuple → list of floats; bad/missing → null.
    """
    if isinstance(x, (list, tuple)):
        out: list[float] = []
        for raw in x:
            v = _as_finite(raw)
            if v is None:
                return None
            out.append(v / (1.0 + abs(v)))
        return out
    v = _as_finite(x)
    if v is None:
        return None
    return v / (1.0 + abs(v))


COLUMN_BACKED_FUNCS: Sequence[str] = ("softsign",)