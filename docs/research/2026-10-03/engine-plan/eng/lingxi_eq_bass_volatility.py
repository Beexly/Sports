"""Printed Bass win-martingale volatility (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Campbell and Engelund, When should one stop the most exciting game?,
arXiv:2608.12291, Section 8, PDF page 44. Also noted in
docs/arxiv-program/research/2026-09-21/arxiv-deep/0275-when-should-one-stop-the-most.md.

    sigma_B(x) = phi(Phi^{-1}(x))

phi is the standard normal density and Phi^{-1} its quantile function.
Not sigma_A(x) = sin(pi*x)/pi, and not sigma_I(x) = x*(1-x).
"""
from __future__ import annotations

import math
import statistics

IDENTITY = "lingxi"


def bass_volatility(x: float | None) -> float | None:
    """phi(Phi^{-1}(x)). arXiv:2608.12291 Section 8, PDF page 44."""
    if x is None:
        return None
    value = float(x)
    if not math.isfinite(value) or value <= 0.0 or value >= 1.0:
        return None
    normal = statistics.NormalDist()
    return normal.pdf(normal.inv_cdf(value))


COLUMN_BACKED_FUNCS = ("bass_volatility",)