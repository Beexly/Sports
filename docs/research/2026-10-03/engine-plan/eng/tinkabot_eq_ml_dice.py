"""Stated ML/ecology identity: Dice coefficient (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Dice, L. R. \"Measures of the Amount of Ecologic Association Between
  Species,\" Ecology 26(3), 1945, https://doi.org/10.2307/1932409
  printed p. 298: S = 2h / (a + b), where h is the count of species in
  both samples and a, b are the sample species counts.

a, b, h are caller-supplied. No hard-coded coefficients beyond the stated 2.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def dice_coefficient(
    h: float | None,
    a: float | None,
    b: float | None,
) -> float | None:
    """S = 2*h / (a + b).

    Missing → null. Negative h/a/b → null. a+b <= 0 → null.
    h > min(a, b) → null (impossible overlap count).
    """
    if h is None or a is None or b is None:
        return None
    hh = float(h)
    aa = float(a)
    bb = float(b)
    if hh < 0.0 or aa < 0.0 or bb < 0.0:
        return None
    denom = aa + bb
    if denom <= 0.0:
        return None
    if hh > aa or hh > bb:
        return None
    return (2.0 * hh) / denom


COLUMN_BACKED_FUNCS: Sequence[str] = ("dice_coefficient",)
