"""Stated physics identity: mechanical power (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax College Physics 2e, §7.7 Power,
  https://openstax.org/books/college-physics-2e/pages/7-7-power
  prints P = W / t (average power equals work over time).
  Missing work or time, or non-positive time → null.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def mechanical_power(
    work: float | None,
    time: float | None,
) -> float | None:
    """P = W / t.

    Missing any argument, or time ≤ 0 → null.
    """
    if work is None or time is None:
        return None
    w = float(work)
    t = float(time)
    if t <= 0.0:
        return None
    return w / t


COLUMN_BACKED_FUNCS: Sequence[str] = ("mechanical_power",)
