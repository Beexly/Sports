"""Stated physics identity: centripetal force (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax College Physics 2e, §6.3 Centripetal Force,
  https://openstax.org/books/college-physics-2e/pages/6-3-centripetal-force
  prints F_c = m v² / r.
  Missing mass, speed, or radius, or non-positive radius → null.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def centripetal_force(
    mass: float | None,
    speed: float | None,
    radius: float | None,
) -> float | None:
    """F_c = m v² / r.

    Missing any argument, or radius ≤ 0 → null.
    """
    if mass is None or speed is None or radius is None:
        return None
    m = float(mass)
    v = float(speed)
    r = float(radius)
    if r <= 0.0:
        return None
    return m * (v * v) / r


COLUMN_BACKED_FUNCS: Sequence[str] = ("centripetal_force",)
