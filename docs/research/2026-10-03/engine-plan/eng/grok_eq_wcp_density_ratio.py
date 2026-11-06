"""Weighted conformal prediction density-ratio weight as printed in Stiller et al., arXiv:2611.08409 eq (1).

w_i ∝ p_test(x_i) / p_cal(x_i). The core ratio is p_test / p_cal.
Missing inputs, non-positive densities, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def wcp_density_ratio(p_test: float | None, p_cal: float | None) -> float | None:
    if p_test is None or p_cal is None:
        return None
    try:
        pt = float(p_test)
        pc = float(p_cal)
    except (TypeError, ValueError):
        return None
    if pt <= 0.0 or pc <= 0.0:
        return None
    try:
        return pt / pc
    except (ZeroDivisionError, OverflowError):
        return None
