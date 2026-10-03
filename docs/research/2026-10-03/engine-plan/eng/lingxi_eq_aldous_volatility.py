"""Printed Aldous win-martingale volatility (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Campbell and Engelund, When should one stop the most exciting game?,
arXiv:2608.12291, Section 8, PDF page 44. Also noted in
docs/arxiv-program/research/2026-09-21/arxiv-deep/0275-when-should-one-stop-the-most.md.

    sigma_A(x) = sin(pi * x) / pi

Not the Bass coefficient, not sigma_I(x) = x(1-x), and not g_L2.
"""
from __future__ import annotations

import math

IDENTITY = "lingxi"


def aldous_volatility(x: float | None) -> float | None:
    """sin(pi*x)/pi. arXiv:2608.12291 Section 8, PDF page 44."""
    if x is None:
        return None
    value = float(x)
    if not math.isfinite(value):
        return None
    return math.sin(math.pi * value) / math.pi


COLUMN_BACKED_FUNCS = ("aldous_volatility",)