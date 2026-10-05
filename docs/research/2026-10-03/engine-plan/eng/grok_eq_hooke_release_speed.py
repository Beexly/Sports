"""Release speed from stored elastic energy, OpenStax College Physics 2e eq. 16.7.

v = (2 * PE_el / m) ** (1/2)

Source: https://openstax.org/books/college-physics-2e/pages/16-1-hookes-law-stress-and-strain-revisited
Opened 2026-10-04. Example 16.2 prints eq. 16.7: PE_el = 0.563 J, m = 0.002 kg, v = 23.7 m/s.
Equations 16.1, 16.2, and 16.4 already wired. Not a pick. Never main.
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


def hooke_release_speed(elastic_energy: Any, mass: Any) -> float | None:
    """Apply printed eq. 16.7. Fail closed if mass is not positive, energy is negative, or inputs are non-finite."""
    pe = _finite(elastic_energy)
    m = _finite(mass)
    if pe is None or m is None or m <= 0.0 or pe < 0.0:
        return None
    speed = math.sqrt((2.0 * pe) / m)
    if not math.isfinite(speed):
        return None
    return speed


FUNCTIONS = {"hooke_release_speed": hooke_release_speed}
PICKS_SETTLED = 0
