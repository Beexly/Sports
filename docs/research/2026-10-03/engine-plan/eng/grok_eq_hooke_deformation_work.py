"""Work to deform a Hooke system, OpenStax College Physics 2e §16.1 Method B.

W = F_app * d = [(1/2) * k * x] * x = (1/2) * k * x^2

Source: https://openstax.org/books/college-physics-2e/pages/16-1-hookes-law-stress-and-strain-revisited
Opened 2026-10-05. Printed in the deformation-work paragraph and Figure 16.6 caption.
Equations 16.1, 16.2, 16.4, 16.6, 16.7 and F_app=kx already wired. Not a pick. Never main.
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


def hooke_deformation_work(force_constant: Any, displacement: Any) -> float | None:
    """Apply printed W = (1/2) k x^2. Fail closed if k is not positive or inputs are non-finite."""
    k = _finite(force_constant)
    x = _finite(displacement)
    if k is None or x is None or k <= 0.0:
        return None
    work = 0.5 * k * x * x
    if not math.isfinite(work):
        return None
    return work


FUNCTIONS = {"hooke_deformation_work": hooke_deformation_work}
PICKS_SETTLED = 0
