"""Stated physics identity: impulse (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax College Physics 2e, §8.2 Impulse,
  https://openstax.org/books/college-physics-2e/pages/8-2-impulse
  prints Impulse = F_net Δt (constant net force over time interval Δt).
  Missing force or time interval → null.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def impulse(
    force: float | None,
    delta_t: float | None,
) -> float | None:
    """J = F_net Δt.

    Missing any argument → null.
    """
    if force is None or delta_t is None:
        return None
    return float(force) * float(delta_t)


COLUMN_BACKED_FUNCS: Sequence[str] = ("impulse",)
