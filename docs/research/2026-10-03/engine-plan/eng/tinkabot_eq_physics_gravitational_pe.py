"""Stated physics identity: gravitational potential energy (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax College Physics 2e, §7.3 Gravitational Potential Energy,
  https://openstax.org/books/college-physics-2e/pages/7-3-gravitational-potential-energy
  prints PE_g = m g h near Earth's surface (constant g).
  Missing mass, g, or height → null.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def gravitational_potential_energy(
    mass: float | None,
    g: float | None,
    height: float | None,
) -> float | None:
    """PE_g = m g h.

    Missing any argument → null.
    """
    if mass is None or g is None or height is None:
        return None
    return float(mass) * float(g) * float(height)


COLUMN_BACKED_FUNCS: Sequence[str] = ("gravitational_potential_energy",)
