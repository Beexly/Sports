"""Stated physics identity: period from frequency (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax College Physics 2e, §16.2 Period and Frequency in Oscillations,
  https://openstax.org/books/college-physics-2e/pages/16-2-period-and-frequency-in-oscillations
  prints T = 1 / f.
  Missing frequency, or non-positive frequency → null.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def period_from_frequency(
    frequency: float | None,
) -> float | None:
    """T = 1 / f.

    Missing frequency, or frequency ≤ 0 → null.
    """
    if frequency is None:
        return None
    f = float(frequency)
    if f <= 0.0:
        return None
    return 1.0 / f


COLUMN_BACKED_FUNCS: Sequence[str] = ("period_from_frequency",)
