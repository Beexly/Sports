"""Kinetic energy matching stored elastic energy, OpenStax College Physics 2e eq. 16.6.

KE_f = (1/2) * m * v^2 = PE_el

Source: https://openstax.org/books/college-physics-2e/pages/16-1-hookes-law-stress-and-strain-revisited
Opened 2026-10-05. Example 16.2 prints eq. 16.6: (1/2) m v^2 = PE_el = 0.563 J.
Equations 16.1, 16.2, 16.4, and 16.7 already wired. Not a pick. Never main.
Jensen-Shannon 63d5c908 stays held. Picks settled stay 0.
"""
from __future__ import annotations

import math
from typing import Any


def _finite(x: Any) -> float | None:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v):
        return None
    return v


def hooke_release_kinetic(mass: Any, speed: Any) -> float | None:
    """Apply printed eq. 16.6. Fail closed if mass is not positive or inputs are non-finite."""
    m = _finite(mass)
    v = _finite(speed)
    if m is None or v is None or m <= 0.0:
        return None
    kinetic = 0.5 * m * v * v
    if not math.isfinite(kinetic):
        return None
    return kinetic


FUNCTIONS = {"hooke_release_kinetic": hooke_release_kinetic}
PICKS_SETTLED = 0
