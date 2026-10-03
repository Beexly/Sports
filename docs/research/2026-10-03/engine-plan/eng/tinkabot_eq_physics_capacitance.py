"""Stated physics identity: capacitance (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax College Physics 2e, §19.5 Capacitors and Capacitance,
  https://openstax.org/books/college-physics-2e/pages/19-5-capacitors-and-capacitance
  prints C = Q / V.
  Missing charge or voltage, or zero voltage → null.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def capacitance(
    charge: float | None,
    voltage: float | None,
) -> float | None:
    """C = Q / V.

    Missing any argument, or voltage == 0 → null.
    """
    if charge is None or voltage is None:
        return None
    q = float(charge)
    v = float(voltage)
    if v == 0.0:
        return None
    return q / v


COLUMN_BACKED_FUNCS: Sequence[str] = ("capacitance",)
