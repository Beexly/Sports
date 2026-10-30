"""Guarded aggregate gap from Tilted Mondrian arXiv:2610.24813 eq (5).

Delta(alpha) = sum_z pi_a(z) * Delta_z(alpha) + sum_z {pi_a(z) - pi_b(z)} * V_b,z(alpha)

Fail-closed on invalid inputs. Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Mapping


def tilted_mondrian_aggregate_gap(
    pi_a: Mapping[str, float] | None,
    pi_b: Mapping[str, float] | None,
    delta_z: Mapping[str, float] | None,
    v_b_z: Mapping[str, float] | None,
) -> float | None:
    if pi_a is None or pi_b is None or delta_z is None or v_b_z is None:
        return None
    try:
        keys = set(pi_a) | set(pi_b) | set(delta_z) | set(v_b_z)
        if not keys:
            return None
        total = 0.0
        for z in keys:
            pa = float(pi_a.get(z, 0.0))
            pb = float(pi_b.get(z, 0.0))
            dz = float(delta_z.get(z, 0.0))
            vb = float(v_b_z.get(z, 0.0))
            if not all(math.isfinite(v) for v in (pa, pb, dz, vb)):
                return None
            if pa < 0.0 or pb < 0.0:
                return None
            total += pa * dz + (pa - pb) * vb
        return total
    except (TypeError, ValueError, OverflowError):
        return None
