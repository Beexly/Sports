"""Printed non-sports identity: log-sum-exp (lingxi lane).

One function. Not sports. No I/O. Does not score or mint.

Book:
Boyd, S. and Vandenberghe, L. (2004). Convex Optimization.
Cambridge University Press. Section 3.1.5, the log-sum-exp function
  f(x) = log(sum_i exp(x_i)).
Natural log. No added constant. Computed as
  m + log(sum_i exp(x_i - m)), m = max x_i,
which is the same value as the printed sum.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def log_sum_exp(x: Sequence[float] | None) -> float | None:
    """f(x) = log(sum_i exp(x_i))."""
    if x is None or len(x) == 0:
        return None
    vals: list[float] = []
    for raw in x:
        if raw is None:
            return None
        v = float(raw)
        if not math.isfinite(v):
            return None
        vals.append(v)
    m = max(vals)
    return m + math.log(sum(math.exp(v - m) for v in vals))


COLUMN_BACKED_FUNCS: Sequence[str] = ("log_sum_exp",)