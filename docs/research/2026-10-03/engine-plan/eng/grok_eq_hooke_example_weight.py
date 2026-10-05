"""Example weight in OpenStax College Physics 2e §16.1 Example 16.1.

w = m g

Source: https://openstax.org/books/college-physics-2e/pages/16-1-hookes-law-stress-and-strain-revisited
Opened 2026-10-05. Printed in Example 16.1 strategy:
w = mg = (80.0 kg)(9.80 m/s^2) = 784 N.
Equations 16.1, 16.2, 16.4, 16.5/Method B, 16.6, 16.7 and F_app=kx already wired.
Not a pick. Never main.
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


def hooke_example_weight(mass_kg: Any, g_m_s2: Any) -> float | None:
    """Apply printed w = m g. Fail closed if m or g is not positive or inputs are non-finite."""
    m = _finite(mass_kg)
    g = _finite(g_m_s2)
    if m is None or g is None or m <= 0.0 or g <= 0.0:
        return None
    weight = m * g
    if not math.isfinite(weight):
        return None
    return weight


FUNCTIONS = {"hooke_example_weight": hooke_example_weight}
PICKS_SETTLED = 0
