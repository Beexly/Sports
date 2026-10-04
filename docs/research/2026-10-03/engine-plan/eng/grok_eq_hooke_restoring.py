"""Hooke's law restoring force as printed in OpenStax College Physics 2e eq. 16.1.

F = -k x

Source: https://openstax.org/books/college-physics-2e/pages/16-1-hookes-law-stress-and-strain-revisited
Opened 2026-10-04. Equation 16.1 matches. Equation 16.4 already wired. Not a pick. Never main.
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


def hooke_restoring_force(k: Any, x: Any) -> float | None:
    """Apply printed eq. 16.1. Fail closed if k is not positive or inputs are non-finite."""
    k_val = _finite(k)
    x_val = _finite(x)
    if k_val is None or x_val is None or k_val <= 0.0:
        return None
    return -k_val * x_val


FUNCTIONS = {"hooke_restoring_force": hooke_restoring_force}
PICKS_SETTLED = 0
