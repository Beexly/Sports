"""Stated physics identity: pressure (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax College Physics 2e, §11.3 Pressure,
  https://openstax.org/books/college-physics-2e/pages/11-3-pressure
  prints P = F / A.
  Missing force or area, or non-positive area → null.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def pressure(
    force: float | None,
    area: float | None,
) -> float | None:
    """P = F / A.

    Missing any argument, or area ≤ 0 → null.
    """
    if force is None or area is None:
        return None
    f = float(force)
    a = float(area)
    if a <= 0.0:
        return None
    return f / a


COLUMN_BACKED_FUNCS: Sequence[str] = ("pressure",)
