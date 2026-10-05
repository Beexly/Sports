"""Applied force opposite the restoring force, OpenStax College Physics 2e section 16.1.

F_app = k x

Source: https://openstax.org/books/college-physics-2e/pages/16-1-hookes-law-stress-and-strain-revisited
Opened 2026-10-04 night growth. Printed after eq. 16.1: the applied force is exactly
opposite the restoring force, so F_app = kx. Example 16.2 uses k = 50.0 N/m and
x = 0.150 m (F_app = 7.5 N). Eqs 16.1, 16.2, 16.4, and 16.7 already wired.
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


def hooke_applied_force(k: Any, x: Any) -> float | None:
    """Apply printed F_app = kx. Fail closed if k is not positive or inputs are non-finite."""
    k_val = _finite(k)
    x_val = _finite(x)
    if k_val is None or x_val is None or k_val <= 0.0:
        return None
    force = k_val * x_val
    if not math.isfinite(force):
        return None
    return force


FUNCTIONS = {"hooke_applied_force": hooke_applied_force}
PICKS_SETTLED = 0
