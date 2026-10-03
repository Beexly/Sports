"""Stated physics identity: buoyant force / Archimedes (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax College Physics 2e, §11.7 Archimedes’ Principle,
  https://openstax.org/books/college-physics-2e/pages/11-7-archimedes-principle
  prints F_b = ρ V g (weight of the fluid displaced).
  Missing density, volume, or g → null.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def buoyant_force(
    fluid_density: float | None,
    displaced_volume: float | None,
    g: float | None,
) -> float | None:
    """F_b = ρ V g.

    Missing any argument → null.
    """
    if fluid_density is None or displaced_volume is None or g is None:
        return None
    return float(fluid_density) * float(displaced_volume) * float(g)


COLUMN_BACKED_FUNCS: Sequence[str] = ("buoyant_force",)
