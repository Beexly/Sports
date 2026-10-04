"""Hooke's law force constant as printed in OpenStax College Physics 2e eq. 16.2.

k = -F / x

Source: https://openstax.org/books/college-physics-2e/pages/16-1-hookes-law-stress-and-strain-revisited
Opened 2026-10-04. Equation 16.2 matches the worked example (k = -784 / -1.20e-2).
Equations 16.1 and 16.4 already wired. Not a pick. Never main.
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


def hooke_force_constant(force: Any, displacement: Any) -> float | None:
    """Apply printed eq. 16.2. Fail closed if x is 0, inputs are non-finite, or k is not positive."""
    f_val = _finite(force)
    x_val = _finite(displacement)
    if f_val is None or x_val is None or x_val == 0.0:
        return None
    k = -f_val / x_val
    if not math.isfinite(k) or k <= 0.0:
        return None
    return k


FUNCTIONS = {"hooke_force_constant": hooke_force_constant}
PICKS_SETTLED = 0
