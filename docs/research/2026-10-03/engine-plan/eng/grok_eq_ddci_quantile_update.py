"""DDCI online quantile update as printed in Du et al. arXiv:2610.26987 eq (2).

q_{t+1} = q_t + eta_t * (err_t - alpha)

err_t in {0,1}, eta > 0, alpha in (0,1). Missing, invalid, or math failure -> None.
Does not score, mint, or write mind.jsonl.
Source: https://arxiv.org/html/2610.26987v1 opened 2026-10-25.
"""
from __future__ import annotations

import math


def ddci_quantile_update(
    q: float | None,
    eta: float | None,
    err: float | None,
    alpha: float | None,
) -> float | None:
    if q is None or eta is None or err is None or alpha is None:
        return None
    try:
        qq = float(q)
        ee = float(eta)
        er = float(err)
        aa = float(alpha)
        if not (math.isfinite(qq) and math.isfinite(ee) and math.isfinite(er) and math.isfinite(aa)):
            return None
        if ee <= 0.0 or not (0.0 < aa < 1.0):
            return None
        if er not in (0.0, 1.0):
            return None
        res = qq + ee * (er - aa)
        if not math.isfinite(res):
            return None
        return float(res)
    except (ValueError, OverflowError, TypeError):
        return None
