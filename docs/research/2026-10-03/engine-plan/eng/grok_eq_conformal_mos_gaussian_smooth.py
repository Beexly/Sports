"""Guarded Gaussian-smoothed soft targets from arXiv:2610.36126 printed eq (4).

\tilde{q}_k(y) = exp(-(y - c_k)^2 / (2 sigma^2)) / sum_j exp(-(y - c_j)^2 / (2 sigma^2))

Missing, non-numeric, non-finite, non-positive sigma, or empty centers fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def conformal_mos_gaussian_smooth(
    y: float | None,
    centers: Sequence[float] | None,
    sigma: float | None,
) -> list[float] | None:
    if y is None or centers is None or sigma is None:
        return None
    if not centers:
        return None
    try:
        yf = float(y)
        sig = float(sigma)
        cs = [float(c) for c in centers]
        if not all(math.isfinite(v) for v in [yf, sig] + cs):
            return None
        if sig <= 0.0:
            return None
        if any(abs(v) > 1e6 for v in [yf, sig] + cs):
            return None
        exps = [math.exp(-((yf - c) ** 2) / (2.0 * sig * sig)) for c in cs]
        total = sum(exps)
        if total <= 0.0 or not math.isfinite(total):
            return None
        result = [e / total for e in exps]
        if not all(math.isfinite(r) and r >= 0.0 for r in result):
            return None
        if abs(sum(result) - 1.0) > 1e-6:
            return None
        return result
    except (TypeError, ValueError, OverflowError):
        return None
