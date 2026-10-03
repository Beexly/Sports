"""Printed Plackett-Luce ranking score (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Not the Skellam margin score (equation 23). Not Elo. Not contrastive loss.

Holy and Cerny, Score-Driven Rating System for Sports, arXiv:2604.09143v1,
equation (30), PDF page 10. Also noted in
docs/arxiv-program/research/2026-09-21/arxiv-deep/0549-scoredriven-rating-system-for-sports.md
equation (30):

    nabla_i = alpha * (1 - sum_{p=1}^{y_i} exp(alpha*r_i) / sum_{q=p}^{m} exp(alpha*r_{q-th}))

for a player in the match. alpha > 0. ratings_by_rank[0] is first place.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def plackett_luce_score(
    ratings_by_rank: Sequence[float] | None,
    rank: int | None,
    alpha: float | None,
) -> float | None:
    """Eq (30), arXiv:2604.09143v1 PDF page 10. rank is 1-based finish place."""
    if ratings_by_rank is None or rank is None or alpha is None:
        return None
    if isinstance(rank, bool) or not isinstance(rank, int):
        return None
    a = float(alpha)
    if not math.isfinite(a) or a <= 0.0:
        return None
    ratings: list[float] = []
    for raw in ratings_by_rank:
        if raw is None:
            return None
        value = float(raw)
        if not math.isfinite(value):
            return None
        ratings.append(value)
    m = len(ratings)
    if m < 2 or rank < 1 or rank > m:
        return None
    ri = ratings[rank - 1]
    total = 0.0
    for p in range(1, rank + 1):
        denom = 0.0
        for q in range(p, m + 1):
            denom += math.exp(a * ratings[q - 1])
        if denom == 0.0 or not math.isfinite(denom):
            return None
        total += math.exp(a * ri) / denom
    score = a * (1.0 - total)
    if not math.isfinite(score):
        return None
    return score


COLUMN_BACKED_FUNCS = ("plackett_luce_score",)