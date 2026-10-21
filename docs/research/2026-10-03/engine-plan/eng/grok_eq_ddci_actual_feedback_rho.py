"""Guarded rho scaling for actual feedback from Du et al. arXiv:2610.26987 eq (3).

rho_t = min( |e_t| / max_{i,j} |s_i - s_j| , 1 )

Fail-closed: None on missing, non-finite, non-positive max_diff, or math failure.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def ddci_actual_feedback_rho(
    e_t: float | None,
    max_abs_diff: float | None,
) -> float | None:
    if e_t is None or max_abs_diff is None:
        return None
    try:
        et = float(e_t)
        md = float(max_abs_diff)
        if not math.isfinite(et) or not math.isfinite(md) or md <= 0.0:
            return None
        rho = min(abs(et) / md, 1.0)
        if not math.isfinite(rho) or rho < 0.0:
            return None
        return float(rho)
    except (TypeError, ValueError, OverflowError, ZeroDivisionError):
        return None
