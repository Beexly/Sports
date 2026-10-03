"""Printed pairwise ranking loss plus sampling cost (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Chen, Chen, and Li, Asymptotically Optimal Sequential Design for Rank
Aggregation, arXiv:1710.06056v1, displayed loss in Section 1, PDF page 2
(footer page 2). Also noted in
docs/arxiv-program/research/2026-09-21/arxiv-deep/0612-asymptotically-optimal-sequential-design-for-rank.md.

Printed sum over i < j:

    I(theta_i > theta_j) I(R_i > R_j) + I(theta_i < theta_j) I(R_i < R_j) + c T

c > 0. Ties add nothing. This is the printed indicator direction, not the
swapped discordant-pair count.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "lingxi"


def _finite(value: float) -> float | None:
    number = float(value)
    if number != number or number in (float("inf"), float("-inf")):
        return None
    return number


def kendall_sampling_loss(
    theta: Sequence[float] | None,
    rank: Sequence[float] | None,
    cost: float | None,
    comparisons: float | None,
) -> float | None:
    """Printed page-2 loss. cost is c > 0. comparisons is T >= 0."""
    if theta is None or rank is None or cost is None or comparisons is None:
        return None
    c = _finite(cost)
    t = _finite(comparisons)
    if c is None or t is None or c <= 0.0 or t < 0.0:
        return None
    if len(theta) != len(rank) or len(theta) < 2:
        return None
    scores: list[float] = []
    ranks: list[float] = []
    for raw_theta, raw_rank in zip(theta, rank):
        if raw_theta is None or raw_rank is None:
            return None
        score = _finite(raw_theta)
        place = _finite(raw_rank)
        if score is None or place is None:
            return None
        scores.append(score)
        ranks.append(place)
    total = c * t
    n = len(scores)
    for i in range(n):
        for j in range(i + 1, n):
            same_high = scores[i] > scores[j] and ranks[i] > ranks[j]
            same_low = scores[i] < scores[j] and ranks[i] < ranks[j]
            if same_high or same_low:
                total += 1.0
    return total


COLUMN_BACKED_FUNCS = ("kendall_sampling_loss",)