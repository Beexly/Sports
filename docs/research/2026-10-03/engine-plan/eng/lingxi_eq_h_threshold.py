"""Printed stopping threshold h(c) (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Chen, Chen, and Li, Asymptotically Optimal Sequential Design for Rank
Aggregation, arXiv:1710.06056v1, definition under (3.2), PDF page 8.
Also noted in
docs/arxiv-program/research/2026-09-21/arxiv-deep/0612-asymptotically-optimal-sequential-design-for-rank.md.

    h(c) = |log c| * (1 + |log c| ** (-alpha))

for alpha in (0, 1) and cost c > 0 with log c != 0. Natural log, as printed
"log". Not the page-2 Kendall pair sum.
"""
from __future__ import annotations

import math

IDENTITY = "lingxi"


def h_threshold(cost: float | None, alpha: float | None) -> float | None:
    """h(c) under equation (3.2). arXiv:1710.06056v1 PDF page 8."""
    if cost is None or alpha is None:
        return None
    c = float(cost)
    a = float(alpha)
    if not math.isfinite(c) or not math.isfinite(a):
        return None
    if c <= 0.0 or a <= 0.0 or a >= 1.0:
        return None
    magnitude = abs(math.log(c))
    if magnitude == 0.0:
        return None
    return magnitude * (1.0 + magnitude ** (-a))


COLUMN_BACKED_FUNCS = ("h_threshold",)