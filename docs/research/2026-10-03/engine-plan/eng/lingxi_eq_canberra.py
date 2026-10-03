"""Printed Canberra distance (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not Kendall τ, not Pearson r / Spearman ρ, not BC / D_B,
not Hellinger² / Neyman / softmin / log-softmax.
Does not edit grok_eq_adam.

Lance, G. N. and Williams, W. T., "Computer programs for hierarchical
polythetic classification (\"similarity analyses\")," Comput. J. 9
(1966) 60–64; standard term form (also SciPy canberra):

    d_Can(x, y) = Σ_i |x_i − y_i| / (|x_i| + |y_i|)

When |x_i| + |y_i| = 0 the i-th term is taken as 0.
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


def canberra(x: object, y: object) -> float | None:
    """d_Can = Σ |x_i − y_i| / (|x_i| + |y_i|) (zero denom → 0 term).

    Missing / non-finite, length mismatch, or empty → null.
    """
    if not isinstance(x, (list, tuple)) or not isinstance(y, (list, tuple)):
        return None
    if len(x) == 0 or len(x) != len(y):
        return None
    total = 0.0
    for a_raw, b_raw in zip(x, y):
        a = _as_finite(a_raw)
        b = _as_finite(b_raw)
        if a is None or b is None:
            return None
        denom = abs(a) + abs(b)
        if denom == 0.0:
            continue
        total += abs(a - b) / denom
    if not math.isfinite(total):
        return None
    return total


COLUMN_BACKED_FUNCS: Sequence[str] = ("canberra",)