"""Guarded stable measurement mechanism density ratio from Choi arXiv:2610.34204 printed eq (3).

w((c, z), y) = (q_C(c) / p_C(c)) * (q(y | c) / p(y | c))

Fail-closed on invalid inputs: missing, non-finite, non-positive densities.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def smm_density_ratio(
    q_c: float | None,
    p_c: float | None,
    q_yc: float | None,
    p_yc: float | None,
) -> float | None:
    if q_c is None or p_c is None or q_yc is None or p_yc is None:
        return None
    try:
        qc = float(q_c)
        pc = float(p_c)
        qyc = float(q_yc)
        pyc = float(p_yc)
        if not (math.isfinite(qc) and math.isfinite(pc) and math.isfinite(qyc) and math.isfinite(pyc)):
            return None
        if pc <= 0.0 or pyc <= 0.0 or qc < 0.0 or qyc < 0.0:
            return None
        return (qc / pc) * (qyc / pyc)
    except (TypeError, ValueError, OverflowError, ZeroDivisionError):
        return None
