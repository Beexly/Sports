"""Printed Skellam margin-of-victory score (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Source note: docs/arxiv-program/research/2026-09-21/arxiv-deep/0549-scoredriven-rating-system-for-sports.md
equation (23), checked against the PDF.

Holy and Cerny, Score-Driven Rating System for Sports, arXiv:2604.09143v1,
equation (23), PDF page 8:

    nabla_A = alpha * (y_A - y_B - 2 * sinh(alpha * (r_A - r_B)))

alpha > 0. Not the Elo logistic in equations.elo_win_prob. Not the variance
identity 2*cosh in equation (22).
"""
from __future__ import annotations

import math

IDENTITY = "lingxi"


def skellam_mov_score(
    y_a: float | None,
    y_b: float | None,
    r_a: float | None,
    r_b: float | None,
    alpha: float | None,
) -> float | None:
    """alpha * ((y_A - y_B) - 2 * sinh(alpha * (r_A - r_B))). arXiv 2604.09143 eq (23), PDF page 8."""
    if y_a is None or y_b is None or r_a is None or r_b is None or alpha is None:
        return None
    ya = float(y_a)
    yb = float(y_b)
    ra = float(r_a)
    rb = float(r_b)
    a = float(alpha)
    if not all(math.isfinite(v) for v in (ya, yb, ra, rb, a)):
        return None
    if a <= 0.0:
        return None
    return a * ((ya - yb) - 2.0 * math.sinh(a * (ra - rb)))


COLUMN_BACKED_FUNCS = ("skellam_mov_score",)