"""Stated math identity: circle area (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax, Intermediate Algebra 2e, §9.8 Geometry Formulas,
  https://openstax.org/books/intermediate-algebra-2e/pages/9-8-use-properties-of-circles
  prints Area of a circle: A = π r². Radius form used here:
  A = π * r * r, with r caller-supplied (r≥0). π from math.pi.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def circle_area(
    r: float | None,
) -> float | None:
    """A = π r².

    Missing → null. Negative r → null.
    """
    if r is None:
        return None
    rr = float(r)
    if rr < 0.0:
        return None
    return math.pi * rr * rr


COLUMN_BACKED_FUNCS: Sequence[str] = ("circle_area",)
