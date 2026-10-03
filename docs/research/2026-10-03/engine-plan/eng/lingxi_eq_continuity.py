"""Printed non-sports identity: equation of continuity (lingxi lane).

One function. Not sports. No I/O. Does not score or mint.

Book:
OpenStax College Physics 2e, Section 12.1, Flow Rate and Its Relation
to Velocity. The equation of continuity for incompressible flow:
  A1 * v1 = A2 * v2
so v2 = A1 * v1 / A2.
Areas and the upstream speed are caller-supplied. No extra constant.
A non-positive area returns null.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def continuity_downstream_speed(
    area_1: float | None,
    speed_1: float | None,
    area_2: float | None,
) -> float | None:
    """v2 = A1 * v1 / A2."""
    if area_1 is None or speed_1 is None or area_2 is None:
        return None
    a1 = float(area_1)
    v1 = float(speed_1)
    a2 = float(area_2)
    if not (math.isfinite(a1) and math.isfinite(v1) and math.isfinite(a2)):
        return None
    if a1 <= 0.0 or a2 <= 0.0:
        return None
    return a1 * v1 / a2


COLUMN_BACKED_FUNCS: Sequence[str] = ("continuity_downstream_speed",)