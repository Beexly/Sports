"""Stated physics identity: torque, perpendicular case (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax College Physics 2e, §9.2 The Second Condition for Equilibrium,
  https://openstax.org/books/college-physics-2e/pages/9-2-the-second-condition-for-equilibrium
  prints τ = r F when the force is perpendicular to the lever arm.
  Missing lever arm or force → null.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def torque_perpendicular(
    lever_arm: float | None,
    force: float | None,
) -> float | None:
    """τ = r F (force perpendicular to lever arm).

    Missing any argument → null.
    """
    if lever_arm is None or force is None:
        return None
    return float(lever_arm) * float(force)


COLUMN_BACKED_FUNCS: Sequence[str] = ("torque_perpendicular",)
