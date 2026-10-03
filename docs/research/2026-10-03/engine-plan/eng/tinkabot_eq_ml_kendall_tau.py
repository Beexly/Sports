"""Kendall rank correlation τ = (C − D) / (n(n−1)/2) (Kendall 1938).

Printed tau-a form: concordant minus discordant pairs over all unordered pairs.
One scalar. Distinct from spearman_rho and pearson_corr.
Does not edit grok_eq_adam.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"
COLUMN_BACKED_FUNCS: Sequence[str] = ("kendall_tau",)


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


def kendall_tau(x: object, y: object) -> float | None:
    """τ = (C − D) / (n(n−1)/2) (Kendall 1938 tau-a).

    x, y: equal-length sequences of finite values, length ≥ 2.
    Ties (zero product of deltas) are skipped from C and D but still
    counted in the denominator (tau-a). Missing / unequal → null.
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
    concordant = 0
    discordant = 0
    for i in range(n):
        for j in range(i + 1, n):
            dx = xs[i] - xs[j]
            dy = ys[i] - ys[j]
            prod = dx * dy
            if prod > 0.0:
                concordant += 1
            elif prod < 0.0:
                discordant += 1
            # ties: neither
    denom = n * (n - 1) / 2.0
    if denom == 0.0:
        return None
    out = (concordant - discordant) / denom
    if not math.isfinite(out):
        return None
    return out
