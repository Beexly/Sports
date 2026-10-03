"""Pearson product-moment correlation r (Pearson 1895).

Printed form:
  r = Σ_i (x_i − x̄)(y_i − ȳ) / √[Σ_i (x_i − x̄)² · Σ_i (y_i − ȳ)²]
One scalar. Distinct from spearman_rho and pearson_chi_squared.
Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("pearson_corr",)


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


def pearson_corr(x: object, y: object) -> float | None:
    """r = Σ(x−x̄)(y−ȳ) / √[Σ(x−x̄)² Σ(y−ȳ)²] (Pearson product-moment).

    x, y: equal-length sequences of finite values, length ≥ 2.
    Zero variance in either series → null.
    """
    if not isinstance(x, (list, tuple)) or not isinstance(y, (list, tuple)):
        return None
    if len(x) != len(y) or len(x) < 2:
        return None
    xs: list[float] = []
    ys: list[float] = []
    for a, b in zip(x, y):
        av = _as_finite(a)
        bv = _as_finite(b)
        if av is None or bv is None:
            return None
        xs.append(av)
        ys.append(bv)
    n = len(xs)
    mx = sum(xs) / n
    my = sum(ys) / n
    num = 0.0
    sx = 0.0
    sy = 0.0
    for a, b in zip(xs, ys):
        dx = a - mx
        dy = b - my
        num += dx * dy
        sx += dx * dx
        sy += dy * dy
    denom = math.sqrt(sx * sy)
    if denom == 0.0 or not math.isfinite(denom):
        return None
    out = num / denom
    if not math.isfinite(out):
        return None
    return out
