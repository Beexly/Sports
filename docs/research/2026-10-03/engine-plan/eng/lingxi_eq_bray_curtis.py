"""Printed Bray–Curtis dissimilarity (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not Canberra, not Huber, not perplexity / BCE / Kendall / W₁.
Does not edit grok_eq_adam.

Bray, J. R. and Curtis, J. T., "An ordination of the upland forest
communities of southern Wisconsin," Ecol. Monogr. 27 (1957) 325–349;
quantitative form common in ecology / SciPy braycurtis:

    d_BC(x, y) = Σ_i |x_i − y_i| / Σ_i (x_i + y_i)

Caller supplies equal-length non-negative vectors. Zero total mass → null.
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


def bray_curtis(x: object, y: object) -> float | None:
    """d_BC = Σ |x_i − y_i| / Σ (x_i + y_i).

    Missing / non-finite / negative, length mismatch, empty, or zero
    denominator → null.
    """
    if not isinstance(x, (list, tuple)) or not isinstance(y, (list, tuple)):
        return None
    if len(x) == 0 or len(x) != len(y):
        return None
    num = 0.0
    den = 0.0
    for a_raw, b_raw in zip(x, y):
        a = _as_finite_nonneg(a_raw)
        b = _as_finite_nonneg(b_raw)
        if a is None or b is None:
            return None
        num += abs(a - b)
        den += a + b
    if den == 0.0 or not math.isfinite(num) or not math.isfinite(den):
        return None
    return num / den


COLUMN_BACKED_FUNCS: Sequence[str] = ("bray_curtis",)