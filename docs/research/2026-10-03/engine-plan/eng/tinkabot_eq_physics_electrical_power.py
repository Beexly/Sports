"""Stated physics identity: electrical power (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax College Physics 2e, §20.4 Electric Power and Energy,
  https://openstax.org/books/college-physics-2e/pages/20-4-electric-power-and-energy
  prints P = I V (power equals current times voltage).
  Missing current or voltage → null.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def electrical_power(
    current: float | None,
    voltage: float | None,
) -> float | None:
    """P = I V.

    Missing any argument → null.
    """
    if current is None or voltage is None:
        return None
    return float(current) * float(voltage)


COLUMN_BACKED_FUNCS: Sequence[str] = ("electrical_power",)
