"""Printed Kulczyński similarity (lingxi lane).

One function. No I/O. Does not score a slate or mint.
Not Jaccard index/distance, not Ochiai, not Dice 2h/(a+b),
not Soergel/Clark/Lorentzian. Does not edit grok_eq_adam.

Kulczyński, S., \"Die Pflanzenassoziationen der Pieninen,\"
Bull. Int. Acad. Pol. Sci. Lett. Cl. Sci. Math. Nat., B (1927);
standard arithmetic-mean form:

    K = ½ (h/a + h/b)

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


def kulczynski(h: object, a: object, b: object) -> float | None:
    """K = ½ (h/a + h/b).

    Missing / non-finite / negative, h > a or h > b, or a=0 or b=0 → null.
    """
    hh = _as_finite_nonneg(h)
    aa = _as_finite_nonneg(a)
    bb = _as_finite_nonneg(b)
    if hh is None or aa is None or bb is None:
        return None
    if hh > aa or hh > bb:
        return None
    if aa == 0.0 or bb == 0.0:
        return None
    out = 0.5 * (hh / aa + hh / bb)
    if not math.isfinite(out):
        return None
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = ("kulczynski",)