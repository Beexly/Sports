"""Guarded CQR conformity score from Moradi et al. arXiv:2602.02583 printed eq (13).

s_tau = max( q_hat^{alpha/2}(x_tau) - y_tau , y_tau - q_hat^{1-alpha/2}(x_tau) )

Missing, non-numeric, or inverted interval fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def cqr_conformity_score(q_low: float | None, q_high: float | None, y: float | None) -> float | None:
    if any(v is None or not isinstance(v, (int, float)) for v in (q_low, q_high, y)):
        return None
    try:
        ql = float(q_low)
        qh = float(q_high)
        yy = float(y)
        if ql > qh:
            return None
        return max(ql - yy, yy - qh)
    except (TypeError, ValueError, OverflowError):
        return None
