"""Stated physics identity: Snell's law for refracted index (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax, College Physics 2e, §25.3 The Law of Refraction,
  https://openstax.org/books/college-physics-2e/pages/25-3-the-law-of-refraction
  prints n₁ sin θ₁ = n₂ sin θ₂. Rearrangement used here:
  n₂ = n₁ sin θ₁ / sin θ₂, with angles in radians as supplied by the caller.
  n₁, θ₁, θ₂ are caller-supplied (n₁ > 0; sin θ₂ ≠ 0).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def snells_law_n2(
    n1: float | None,
    theta1: float | None,
    theta2: float | None,
) -> float | None:
    """n2 = n1 * sin(theta1) / sin(theta2).

    Missing → null. Non-positive n1 → null. sin(theta2) == 0 → null.
    """
    if n1 is None or theta1 is None or theta2 is None:
        return None
    nn = float(n1)
    t1 = float(theta1)
    t2 = float(theta2)
    if nn <= 0.0:
        return None
    s2 = math.sin(t2)
    if s2 == 0.0:
        return None
    return nn * math.sin(t1) / s2


COLUMN_BACKED_FUNCS: Sequence[str] = ("snells_law_n2",)
