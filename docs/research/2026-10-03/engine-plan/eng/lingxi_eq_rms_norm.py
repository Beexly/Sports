"""Printed non-sports identity: RMSNorm (lingxi lane).

One function. Not sports. No I/O. Does not score or mint.

Paper:
Zhang, B. and Sennrich, R. (2019). Root Mean Square Layer Normalization.
Advances in Neural Information Processing Systems 32. arXiv:1910.07467.
Equation (4):
  a_bar_i = (a_i / RMS(a)) * g_i
  RMS(a) = sqrt( (1/n) sum_i a_i^2 )
Gain g is a caller-supplied vector. No epsilon is added. RMS 0 returns null.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def rms_norm(
    a: Sequence[float] | None,
    g: Sequence[float] | None,
) -> list[float] | None:
    """Equation (4): a_bar_i = (a_i / RMS(a)) * g_i."""
    if a is None or g is None:
        return None
    if len(a) == 0 or len(a) != len(g):
        return None
    vals: list[float] = []
    gains: list[float] = []
    for a_raw, g_raw in zip(a, g):
        if a_raw is None or g_raw is None:
            return None
        aa = float(a_raw)
        gg = float(g_raw)
        if not math.isfinite(aa) or not math.isfinite(gg):
            return None
        vals.append(aa)
        gains.append(gg)
    mean_sq = sum(v * v for v in vals) / float(len(vals))
    if mean_sq == 0.0:
        return None
    rms = math.sqrt(mean_sq)
    return [(v / rms) * gg for v, gg in zip(vals, gains)]


COLUMN_BACKED_FUNCS: Sequence[str] = ("rms_norm",)