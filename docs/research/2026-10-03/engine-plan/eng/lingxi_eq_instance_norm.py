"""Printed non-sports identity: instance normalization (lingxi lane).

One function. Not sports. No I/O. Does not score or mint.

Paper:
Ulyanov, D., Vedaldi, A., and Lempitsky, V. (2016). Instance
Normalization: The Missing Ingredient for Fast Stylization.
arXiv:1607.08022. For one channel of one sample,
  mu = (1/m) sum_i x_i
  sigma = sqrt( (1/m) sum_i (x_i - mu)^2 + eps )
  y_i = gamma * (x_i - mu) / sigma + beta
m is the length of the channel (divisor m, not m-1). gamma, beta,
and eps are caller-supplied scalars. A non-positive sigma returns null.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def instance_norm(
    x: Sequence[float] | None,
    gamma: float | None,
    beta: float | None,
    eps: float | None,
) -> list[float] | None:
    """Normalize one channel, then apply a scalar affine."""
    if x is None or gamma is None or beta is None or eps is None or len(x) == 0:
        return None
    gg = float(gamma)
    bb = float(beta)
    ee = float(eps)
    if not (math.isfinite(gg) and math.isfinite(bb) and math.isfinite(ee)) or ee < 0.0:
        return None
    vals: list[float] = []
    for raw in x:
        if raw is None:
            return None
        xx = float(raw)
        if not math.isfinite(xx):
            return None
        vals.append(xx)
    m = float(len(vals))
    mu = sum(vals) / m
    var = sum((v - mu) * (v - mu) for v in vals) / m
    rad = var + ee
    if rad <= 0.0:
        return None
    sigma = math.sqrt(rad)
    return [gg * ((v - mu) / sigma) + bb for v in vals]


COLUMN_BACKED_FUNCS: Sequence[str] = ("instance_norm",)