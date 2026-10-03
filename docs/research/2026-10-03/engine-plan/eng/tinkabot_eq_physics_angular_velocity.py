"""Stated physics identity: angular velocity (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax College Physics 2e, §10.2 Rotation Angle and Angular Velocity,
  https://openstax.org/books/college-physics-2e/pages/10-2-rotation-angle-and-angular-velocity
  prints ω = Δθ / Δt.
  Missing angle change or time interval, or zero time interval → null.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def angular_velocity(
    delta_theta: float | None,
    delta_t: float | None,
) -> float | None:
    """ω = Δθ / Δt.

    Missing any argument, or Δt == 0 → null.
    """
    if delta_theta is None or delta_t is None:
        return None
    dth = float(delta_theta)
    dt = float(delta_t)
    if dt == 0.0:
        return None
    return dth / dt


COLUMN_BACKED_FUNCS: Sequence[str] = ("angular_velocity",)
