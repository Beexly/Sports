"""Stated physics identity: density (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax College Physics 2e, §11.2 Density,
  https://openstax.org/books/college-physics-2e/pages/11-2-density
  prints ρ = m / V.
  Missing mass or volume, or non-positive volume → null.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def density(
    mass: float | None,
    volume: float | None,
) -> float | None:
    """ρ = m / V.

    Missing any argument, or volume ≤ 0 → null.
    """
    if mass is None or volume is None:
        return None
    m = float(mass)
    v = float(volume)
    if v <= 0.0:
        return None
    return m / v


COLUMN_BACKED_FUNCS: Sequence[str] = ("density",)
