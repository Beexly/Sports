"""Printed non-sports identity: layer normalization (lingxi lane).

One function. Not sports. No I/O. Does not score or mint.

Paper:
Ba, J. L., Kiros, J. R., and Hinton, G. E. (2016). Layer Normalization.
arXiv:1607.06450. Equations (15)-(16):
  LN(z; alpha, beta) = ((z - mu) / sigma) elementwise-times alpha + beta
  mu = (1/D) sum z_i
  sigma = sqrt( (1/D) sum (z_i - mu)^2 )
Gain alpha and bias beta are caller-supplied vectors. No epsilon is added.
A zero sigma returns null.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def layer_norm(
    z: Sequence[float] | None,
    alpha: Sequence[float] | None,
    beta: Sequence[float] | None,
) -> list[float] | None:
    """LN(z; alpha, beta) over one vector. Divisor is D, not D-1."""
    if z is None or alpha is None or beta is None:
        return None
    if len(z) == 0 or len(z) != len(alpha) or len(z) != len(beta):
        return None
    vals: list[float] = []
    gains: list[float] = []
    biases: list[float] = []
    for z_raw, a_raw, b_raw in zip(z, alpha, beta):
        if z_raw is None or a_raw is None or b_raw is None:
            return None
        zz = float(z_raw)
        aa = float(a_raw)
        bb = float(b_raw)
        if not (math.isfinite(zz) and math.isfinite(aa) and math.isfinite(bb)):
            return None
        vals.append(zz)
        gains.append(aa)
        biases.append(bb)
    d = float(len(vals))
    mu = sum(vals) / d
    var = sum((v - mu) * (v - mu) for v in vals) / d
    if var == 0.0:
        return None
    sigma = math.sqrt(var)
    return [((v - mu) / sigma) * g + b for v, g, b in zip(vals, gains, biases)]


COLUMN_BACKED_FUNCS: Sequence[str] = ("layer_norm",)