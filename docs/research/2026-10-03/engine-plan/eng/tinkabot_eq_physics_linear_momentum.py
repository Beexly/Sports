"""Stated physics identity: linear momentum (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax College Physics 2e, §8.1 Linear Momentum and Force,
  https://openstax.org/books/college-physics-2e/pages/8-1-linear-momentum-and-force
  prints p = m v.
  Missing mass or velocity → null.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def linear_momentum(
    mass: float | None,
    velocity: float | None,
) -> float | None:
    """p = m v.

    Missing any argument → null.
    """
    if mass is None or velocity is None:
        return None
    return float(mass) * float(velocity)


COLUMN_BACKED_FUNCS: Sequence[str] = ("linear_momentum",)
