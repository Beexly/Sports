"""Stated physics identity: translational kinetic energy (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax, College Physics 2e, §7.2 Kinetic Energy,
  https://openstax.org/books/college-physics-2e/pages/7-2-kinetic-energy
  prints KE = (1/2) m v² for translational kinetic energy.
  m and v are caller-supplied (m > 0).
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def kinetic_energy(m: float | None, v: float | None) -> float | None:
    """KE = 0.5 * m * v^2.

    Missing → null. Non-positive m → null.
    """
    if m is None or v is None:
        return None
    mm = float(m)
    vv = float(v)
    if mm <= 0.0:
        return None
    return 0.5 * mm * vv * vv


COLUMN_BACKED_FUNCS: Sequence[str] = ("kinetic_energy",)
