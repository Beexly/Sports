"""Printed non-sports identity: weight normalization (lingxi lane).

One function. Not sports. No I/O. Does not score or mint.

Paper:
Salimans, T. and Kingma, D. P. (2016). Weight Normalization:
A Simple Reparameterization to Accelerate Training of Deep Neural
Networks. arXiv:1602.07868. The reparameterization
  w = (g / ||v||) v
where ||v|| is the Euclidean norm of v. Scalar gain g and vector v
are caller-supplied. A zero norm returns null. No extra constant.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def weight_norm(v: Sequence[float] | None, g: float | None) -> list[float] | None:
    """w = (g / ||v||) * v."""
    if v is None or g is None or len(v) == 0:
        return None
    gg = float(g)
    if not math.isfinite(gg):
        return None
    vals: list[float] = []
    for raw in v:
        if raw is None:
            return None
        vv = float(raw)
        if not math.isfinite(vv):
            return None
        vals.append(vv)
    norm_sq = sum(x * x for x in vals)
    if norm_sq == 0.0:
        return None
    scale = gg / math.sqrt(norm_sq)
    return [scale * x for x in vals]


COLUMN_BACKED_FUNCS: Sequence[str] = ("weight_norm",)