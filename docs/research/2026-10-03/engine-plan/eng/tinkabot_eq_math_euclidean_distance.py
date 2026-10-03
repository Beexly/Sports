"""Stated math identity: 2-D Euclidean distance (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax, College Algebra 2e, §8.8 Distance Formula / Circles,
  or Precalculus 2e §10.1 Distance Formula:
  https://openstax.org/books/precalculus-2e/pages/10-1-points-distance-and-circles
  prints d = √((x₂ − x₁)² + (y₂ − y₁)²).
  This module implements that printed form.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def euclidean_distance(
    x1: float | None,
    y1: float | None,
    x2: float | None,
    y2: float | None,
) -> float | None:
    """d = sqrt((x2 - x1)^2 + (y2 - y1)^2).

    Missing → null.
    """
    if x1 is None or y1 is None or x2 is None or y2 is None:
        return None
    dx = float(x2) - float(x1)
    dy = float(y2) - float(y1)
    return math.sqrt(dx * dx + dy * dy)


COLUMN_BACKED_FUNCS: Sequence[str] = ("euclidean_distance",)
