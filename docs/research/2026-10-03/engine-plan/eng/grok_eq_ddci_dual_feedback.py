"""DDCI dual-feedback threshold update as printed in Du Luo Aickelin, arXiv:2610.26987 eq (5).

q_{t+1} := q_t + eta_t * (err_t - alpha) + eta_t * (actual_feedback - epsilon * estimated_feedback)

Fail-closed on bad inputs. Does not score or write mind.
"""
from __future__ import annotations

import math


def ddci_dual_feedback_update(
    q_t: float | None,
    eta_t: float | None,
    err_t: float | None,
    alpha: float | None,
    actual_feedback: float | None,
    estimated_feedback: float | None,
    epsilon: float | None,
) -> float | None:
    if any(v is None for v in (q_t, eta_t, err_t, alpha, actual_feedback, estimated_feedback, epsilon)):
        return None
    try:
        qt = float(q_t)
        eta = float(eta_t)
        err = float(err_t)
        a = float(alpha)
        act = float(actual_feedback)
        est = float(estimated_feedback)
        eps = float(epsilon)
        if not all(math.isfinite(v) for v in (qt, eta, err, a, act, est, eps)):
            return None
        if eta < 0 or not (0.0 <= a <= 1.0) or eps < 0:
            return None
        return qt + eta * (err - a) + eta * (act - eps * est)
    except (TypeError, ValueError):
        return None
