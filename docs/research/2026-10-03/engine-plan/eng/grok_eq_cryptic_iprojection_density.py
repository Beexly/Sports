"""Guarded A-cryptic I-projection density from Szabadváry arXiv:2610.23131 eq (3).

q*(z) = t(z) * p_S(A(z)) / t_S(A(z))

Missing, non-numeric, zero or negative denom, or math failure fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def cryptic_iprojection_density(
    t_z: float | None,
    p_s_a: float | None,
    t_s_a: float | None,
) -> float | None:
    if t_z is None or p_s_a is None or t_s_a is None:
        return None
    try:
        tz = float(t_z)
        psa = float(p_s_a)
        tsa = float(t_s_a)
        if tsa == 0.0 or tsa < 0.0 or psa < 0.0:
            return None
        dens = tz * psa / tsa
        if dens < 0.0:
            return None
        return float(dens)
    except (TypeError, ValueError, OverflowError, ZeroDivisionError):
        return None
