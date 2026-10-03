"""Stated physics identity: average acceleration (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax College Physics 2e, §2.4 Acceleration,
  https://openstax.org/books/college-physics-2e/pages/2-4-acceleration
  prints a_avg = Δv / Δt.
  Missing velocity change or time interval, or zero time interval → null.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def average_acceleration(
    delta_v: float | None,
    delta_t: float | None,
) -> float | None:
    """a_avg = Δv / Δt.

    Missing any argument, or Δt == 0 → null.
    """
    if delta_v is None or delta_t is None:
        return None
    dv = float(delta_v)
    dt = float(delta_t)
    if dt == 0.0:
        return None
    return dv / dt


COLUMN_BACKED_FUNCS: Sequence[str] = ("average_acceleration",)
