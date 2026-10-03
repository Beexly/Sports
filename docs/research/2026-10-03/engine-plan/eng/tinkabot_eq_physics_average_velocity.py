"""Stated physics identity: average velocity (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax College Physics 2e, §2.3 Time, Velocity, and Speed,
  https://openstax.org/books/college-physics-2e/pages/2-3-time-velocity-and-speed
  prints v_avg = Δx / Δt.
  Missing displacement or time interval, or zero time interval → null.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def average_velocity(
    displacement: float | None,
    delta_t: float | None,
) -> float | None:
    """v_avg = Δx / Δt.

    Missing any argument, or Δt == 0 → null.
    """
    if displacement is None or delta_t is None:
        return None
    dx = float(displacement)
    dt = float(delta_t)
    if dt == 0.0:
        return None
    return dx / dt


COLUMN_BACKED_FUNCS: Sequence[str] = ("average_velocity",)
