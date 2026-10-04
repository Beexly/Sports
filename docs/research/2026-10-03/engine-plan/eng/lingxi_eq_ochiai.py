"""Printed Ochiai (Otsuka–Ochiai) coefficient (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not Jaccard index/distance, not Dice/Tversky/focal-Tversky,
not correlation distance. Does not edit grok_eq_adam.

Ochiai, A., \"Zoogeographical studies on the soleoid fishes found in
Japan and its neighbouring regions — II,\" Bull. Jpn. Soc. Sci. Fish.
22 (1957) 526–530; standard form:

    K = h / √(a · b)

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


def ochiai(h: object, a: object, b: object) -> float | None:
    """K = h / √(a · b).

    Missing / non-finite / negative, h > a or h > b, or a·b = 0 → null.
    """
    hh = _as_finite_nonneg(h)
    aa = _as_finite_nonneg(a)
    bb = _as_finite_nonneg(b)
    if hh is None or aa is None or bb is None:
        return None
    if hh > aa or hh > bb:
        return None
    prod = aa * bb
    if prod == 0.0:
        return None
    out = hh / math.sqrt(prod)
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("ochiai",)