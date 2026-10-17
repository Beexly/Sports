"""Plackett copula from Nelsen 2006 pp. 89-92, printed on CRAN copBasic.

Printed: C_Θ(u,v) = [1+(Θ-1)(u+v) - sqrt([1+(Θ-1)(u+v)]^2 - 4uvΘ(Θ-1))] / [2(Θ-1)]
for Θ > 0, Θ ≠ 1; uv when Θ=1.

Fail-closed: empty/non-finite/out-of-[0,1] or invalid Θ returns None.
"""
from __future__ import annotations

import math
from typing import Optional

IDENTITY = "plackett_copula_nelsen_2006"


def _finite_unit(value: object) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(float(value))
        and 0.0 <= float(value) <= 1.0
    )


def plackett_copula(u: float | None, v: float | None, theta: float | None) -> Optional[float]:
    """Plackett copula. Printed on CRAN copBasic PLACKETTcop page."""
    if not (_finite_unit(u) and _finite_unit(v)):
        return None
    if not (isinstance(theta, (int, float)) and not isinstance(theta, bool) and math.isfinite(float(theta)) and float(theta) > 0.0):
        return None
    uu = float(u)
    vv = float(v)
    th = float(theta)
    if th == 1.0:
        return uu * vv
    # printed formula
    one_plus = 1.0 + (th - 1.0) * (uu + vv)
    disc = one_plus * one_plus - 4.0 * uu * vv * th * (th - 1.0)
    if disc < 0.0:
        return None  # numerical guard
    root = math.sqrt(disc)
    return (one_plus - root) / (2.0 * (th - 1.0))


COLUMN_BACKED_FUNCS: tuple[str, ...] = ("plackett_copula",)
