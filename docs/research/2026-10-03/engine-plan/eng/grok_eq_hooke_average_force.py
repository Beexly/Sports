"""Average applied force, OpenStax College Physics 2e §16.1 Method B.

F_avg = (1/2) k x

Source: https://openstax.org/books/college-physics-2e/pages/16-1-hookes-law-stress-and-strain-revisited
Opened 2026-10-05. Printed in the deformation-work paragraph:
the force increases linearly from 0 to kx, so the average force is (1/2) kx.
Equations 16.1, 16.2, 16.4, 16.6, 16.7, F_app=kx, and W=(1/2)kx^2 already wired.
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


def hooke_average_applied_force(force_constant: Any, displacement: Any) -> float | None:
    """Apply printed F_avg = (1/2) k x. Fail closed if k is not positive or inputs are non-finite."""
    k = _finite(force_constant)
    x = _finite(displacement)
    if k is None or x is None or k <= 0.0:
        return None
    avg = 0.5 * k * x
    if not math.isfinite(avg):
        return None
    return avg


FUNCTIONS = {"hooke_average_applied_force": hooke_average_applied_force}
PICKS_SETTLED = 0
