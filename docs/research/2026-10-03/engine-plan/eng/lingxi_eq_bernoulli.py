"""Printed non-sports identity: Bernoulli sum (lingxi lane).

One function. Not sports. No I/O. Does not score or mint.

Book:
OpenStax College Physics 2e, Section 12.2, Bernoulli's Equation.
Along a streamline,
  P + (1/2) * rho * v^2 + rho * g * h
The factor 1/2 is the printed dynamic-pressure coefficient, not a fit.
P, rho, v, g, and h are caller-supplied. Non-positive density returns null.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def bernoulli_sum(
    pressure: float | None,
    density: float | None,
    speed: float | None,
    gravity: float | None,
    height: float | None,
) -> float | None:
    """P + (1/2) rho v^2 + rho g h."""
    if (
        pressure is None
        or density is None
        or speed is None
        or gravity is None
        or height is None
    ):
        return None
    p = float(pressure)
    rho = float(density)
    v = float(speed)
    g = float(gravity)
    h = float(height)
    if not all(math.isfinite(x) for x in (p, rho, v, g, h)):
        return None
    if rho <= 0.0:
        return None
    return p + 0.5 * rho * v * v + rho * g * h


COLUMN_BACKED_FUNCS: Sequence[str] = ("bernoulli_sum",)