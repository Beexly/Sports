"""Guarded score-driven Elo update from Holy & Cerny arXiv:2604.09143 eq (2).

r_{t+1}^{(A)} = r_t^{(A)} + K * (y_t^{(A)} - 1 / (1 + 10^{-(r_A - r_B)/400}))

Missing, non-numeric, or invalid fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def score_driven_elo_update(
    r_a: float | None,
    r_b: float | None,
    y_a: float | None,
    k: float | None = 16.0,
) -> float | None:
    if r_a is None or r_b is None or y_a is None or k is None:
        return None
    try:
        ra = float(r_a)
        rb = float(r_b)
        ya = float(y_a)
        kk = float(k)
        if not (0.0 <= ya <= 1.0):
            return None
        expected = 1.0 / (1.0 + 10.0 ** (-(ra - rb) / 400.0))
        return float(ra + kk * (ya - expected))
    except (TypeError, ValueError, OverflowError, ZeroDivisionError):
        return None
