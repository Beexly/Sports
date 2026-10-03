"""Printed non-sports identity: de Broglie wavelength (lingxi lane).

One function. Not sports. No I/O. Does not score or mint.

Paper:
de Broglie, L. (1924). Recherches sur la theorie des quanta.
Doctoral thesis, University of Paris. The matter-wave relation
  lambda = h / p
Planck's constant h and momentum magnitude p are caller-supplied.
No numeric value of h is hard-coded. Non-positive p or h returns null.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def de_broglie_wavelength(h: float | None, p: float | None) -> float | None:
    """lambda = h / p."""
    if h is None or p is None:
        return None
    hh = float(h)
    pp = float(p)
    if not math.isfinite(hh) or not math.isfinite(pp):
        return None
    if hh <= 0.0 or pp <= 0.0:
        return None
    return hh / pp


COLUMN_BACKED_FUNCS: Sequence[str] = ("de_broglie_wavelength",)