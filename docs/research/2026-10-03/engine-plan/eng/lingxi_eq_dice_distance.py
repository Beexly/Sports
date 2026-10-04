"""Printed Dice / Sørensen distance (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not Dice coefficient S=2h/(a+b) (tinkabot), not Dice loss, not
Jaccard/Ochiai/Kulczyński. Does not edit grok_eq_adam.

Dice, L. R., \"Measures of the Amount of Ecologic Association Between
Species,\" Ecology 26 (1945) 297–302; complement distance:

    d_Dice = 1 − S = (a + b − 2h) / (a + b)

with h = |A∩B|, a = |A|, b = |B| (caller-supplied non-negative counts).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def _as_finite_nonneg(value: object) -> float | None:
    if value is None or isinstance(value, (str, bytes, bool)):
        return None
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number) or number < 0.0:
        return None
    return number


def dice_distance(h: object, a: object, b: object) -> float | None:
    """d_Dice = (a + b − 2h) / (a + b).

    Missing / non-finite / negative, h > a or h > b, or a+b = 0 → null.
    """
    hh = _as_finite_nonneg(h)
    aa = _as_finite_nonneg(a)
    bb = _as_finite_nonneg(b)
    if hh is None or aa is None or bb is None:
        return None
    if hh > aa or hh > bb:
        return None
    denom = aa + bb
    if denom == 0.0:
        return None
    out = (aa + bb - 2.0 * hh) / denom
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("dice_distance",)