"""Stated physics identity: heat for temperature change (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax College Physics 2e, §14.2 Temperature Change and Heat Capacity,
  https://openstax.org/books/college-physics-2e/pages/14-2-temperature-change-and-heat-capacity
  prints Q = m c ΔT.
  Missing mass, specific heat, or temperature change → null.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def heat_for_temperature_change(
    mass: float | None,
    specific_heat: float | None,
    delta_t: float | None,
) -> float | None:
    """Q = m c ΔT.

    Missing any argument → null.
    """
    if mass is None or specific_heat is None or delta_t is None:
        return None
    return float(mass) * float(specific_heat) * float(delta_t)


COLUMN_BACKED_FUNCS: Sequence[str] = ("heat_for_temperature_change",)
