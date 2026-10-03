"""Stated physics identity: Ohm's law (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax, College Physics 2e, §20.2 Ohm’s Law: Resistance and
  Simple Circuits, https://openstax.org/books/college-physics-2e/pages/20-2-ohms-law-resistance-and-simple-circuits
  prints V = IR (voltage equals current times resistance).
  Ohm (1827) stated the proportionality historically; this module
  implements the modern product form as printed in OpenStax, with I and R
  caller-supplied (R > 0).
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def ohms_law(i: float | None, r: float | None) -> float | None:
    """V = I * R.

    Missing → null. Non-positive R → null.
    """
    if i is None or r is None:
        return None
    ii = float(i)
    rr = float(r)
    if rr <= 0.0:
        return None
    return ii * rr


COLUMN_BACKED_FUNCS: Sequence[str] = ("ohms_law",)
