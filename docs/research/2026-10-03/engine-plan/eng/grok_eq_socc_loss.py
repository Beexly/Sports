"""Guarded SOCC loss from arXiv:2610.24591 printed eq.

L_SOCC(R) = alpha * ES_bar(R) / ES_bar(R_init) + (1 - alpha) * VS_bar(R) / VS_bar(R_init)

Missing, non-numeric, non-finite, or non-positive init scores fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def socc_loss(
    alpha: float | None,
    es_r: float | None,
    es_init: float | None,
    vs_r: float | None,
    vs_init: float | None,
) -> float | None:
    if any(v is None for v in (alpha, es_r, es_init, vs_r, vs_init)):
        return None
    try:
        a = float(alpha)
        esr = float(es_r)
        esi = float(es_init)
        vsr = float(vs_r)
        vsi = float(vs_init)
        vals = (a, esr, esi, vsr, vsi)
        if not all(math.isfinite(v) for v in vals):
            return None
        if not (0.0 <= a <= 1.0):
            return None
        if esi <= 0.0 or vsi <= 0.0:
            return None
        if abs(esr) > 1e9 or abs(vsr) > 1e9 or abs(esi) > 1e9 or abs(vsi) > 1e9:
            return None
        result = a * (esr / esi) + (1.0 - a) * (vsr / vsi)
        if not math.isfinite(result):
            return None
        return result
    except (TypeError, ValueError, OverflowError, ZeroDivisionError):
        return None
