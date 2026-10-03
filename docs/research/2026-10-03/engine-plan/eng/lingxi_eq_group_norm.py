"""Printed non-sports identity: Group Normalization (lingxi lane).

One function. Not sports. No I/O. Does not score or mint.

Paper:
Wu, Y. and He, K. (2018). Group Normalization. European Conference
on Computer Vision. arXiv:1803.08494. Section 3:
  mu_i = (1/m) sum_{k in S_i} x_k
  sigma_i = sqrt( (1/m) sum_{k in S_i} (x_k - mu_i)^2 + eps )
  y_i = gamma_i * (x_i - mu_i) / sigma_i + beta_i
S_i is one equal contiguous group. m is the group length (divisor m, not m-1).
gamma, beta, the group count, and eps are caller-supplied. No baked-in eps.
A non-positive sigma returns null.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def group_norm(
    x: Sequence[float] | None,
    gamma: Sequence[float] | None,
    beta: Sequence[float] | None,
    groups: int | None,
    eps: float | None,
) -> list[float] | None:
    """Per-group mean/variance normalization, then per-element affine."""
    if x is None or gamma is None or beta is None or groups is None or eps is None:
        return None
    if isinstance(groups, bool) or not isinstance(groups, int) or groups < 1:
        return None
    n = len(x)
    if n == 0 or n != len(gamma) or n != len(beta) or n % groups != 0:
        return None
    ee = float(eps)
    if not math.isfinite(ee) or ee < 0.0:
        return None
    vals: list[float] = []
    gains: list[float] = []
    biases: list[float] = []
    for x_raw, g_raw, b_raw in zip(x, gamma, beta):
        if x_raw is None or g_raw is None or b_raw is None:
            return None
        xx = float(x_raw)
        gg = float(g_raw)
        bb = float(b_raw)
        if not (math.isfinite(xx) and math.isfinite(gg) and math.isfinite(bb)):
            return None
        vals.append(xx)
        gains.append(gg)
        biases.append(bb)
    m = n // groups
    out: list[float] = []
    for g in range(groups):
        block = vals[g * m : (g + 1) * m]
        mu = sum(block) / float(m)
        var = sum((v - mu) * (v - mu) for v in block) / float(m)
        rad = var + ee
        if rad <= 0.0:
            return None
        sigma = math.sqrt(rad)
        for j, v in enumerate(block):
            i = g * m + j
            out.append(gains[i] * ((v - mu) / sigma) + biases[i])
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("group_norm",)