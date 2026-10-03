"""Printed Hamming distance (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not Canberra, Bray–Curtis, Huber, MSE. Does not edit grok_eq_adam.

Hamming, R. W., "Error detecting and error correcting codes,"
Bell Syst. Tech. J. 29 (1950) 147–160; normalized form common in
practice / SciPy distance.hamming:

    d_H(x, y) = (1/n) Σ_i 1[x_i ≠ y_i]

Caller supplies equal-length sequences. Empty → null.
Comparisons use finite floats after coerce; non-finite → null.
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


def hamming(x: object, y: object) -> float | None:
    """d_H = (1/n) Σ 1[x_i ≠ y_i].

    Missing / non-finite, length mismatch, or empty → null.
    """
    if not isinstance(x, (list, tuple)) or not isinstance(y, (list, tuple)):
        return None
    n = len(x)
    if n == 0 or n != len(y):
        return None
    diffs = 0
    for a_raw, b_raw in zip(x, y):
        a = _as_finite(a_raw)
        b = _as_finite(b_raw)
        if a is None or b is None:
            return None
        if a != b:
            diffs += 1
    return diffs / n


COLUMN_BACKED_FUNCS: Sequence[str] = ("hamming",)