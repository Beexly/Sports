"""Guarded density ratio under stable measurement from Choi arXiv:2610.34204 eq (3).

w((c, z), y) = [q_C(c) / p_C(c)] * [q(y | c) / p(y | c)]

Missing, non-numeric, non-positive densities, or non-finite fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def stable_measurement_density_ratio(
    q_c: float | None,
    p_c: float | None,
    q_y_given_c: float | None,
    p_y_given_c: float | None,
) -> float | None:
    if any(v is None for v in (q_c, p_c, q_y_given_c, p_y_given_c)):
        return None
    try:
        qc = float(q_c)
        pc = float(p_c)
        qyg = float(q_y_given_c)
        pyg = float(p_y_given_c)
        if not all(math.isfinite(v) for v in (qc, pc, qyg, pyg)):
            return None
        if pc <= 0.0 or pyg <= 0.0 or qc < 0.0 or qyg < 0.0:
            return None
        return (qc / pc) * (qyg / pyg)
    except (TypeError, ValueError, OverflowError):
        return None
