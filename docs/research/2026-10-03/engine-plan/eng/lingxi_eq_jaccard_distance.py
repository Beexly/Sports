"""Printed Jaccard distance (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not Jaccard index J=h/(a+b−h) (tinkabot already has that), not Ochiai,
not Dice/Tversky/Clark/Lorentzian. Does not edit grok_eq_adam.

Jaccard, P., \"The Distribution of the Flora in the Alpine Zone,\"
New Phytologist 11 (1912) 37–38; complement distance:

    d_J = 1 − J = (a + b − 2h) / (a + b − h)

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


def jaccard_distance(h: object, a: object, b: object) -> float | None:
    """d_J = (a + b − 2h) / (a + b − h).

    Missing / non-finite / negative, h > a or h > b, or denom ≤ 0 → null.
    """
    hh = _as_finite_nonneg(h)
    aa = _as_finite_nonneg(a)
    bb = _as_finite_nonneg(b)
    if hh is None or aa is None or bb is None:
        return None
    if hh > aa or hh > bb:
        return None
    denom = aa + bb - hh
    if denom <= 0.0:
        return None
    out = (aa + bb - 2.0 * hh) / denom
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("jaccard_distance",)