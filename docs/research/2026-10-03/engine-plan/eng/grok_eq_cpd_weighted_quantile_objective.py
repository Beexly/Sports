"""Weighted quantile selection objective as printed in Ye et al., arXiv:2610.38046.

q* in argmin_q RMSE(yhat_q) + beta * LateRMSE(yhat_q) + lambda * EarlyRMSE(yhat_q)
Fail-closed on bad inputs. Does not score or write mind.
"""
from __future__ import annotations

import math


def cpd_weighted_quantile_objective(rmse: float | None, late_rmse: float | None, early_rmse: float | None, beta: float | None, lam: float | None) -> float | None:
    if any(v is None for v in (rmse, late_rmse, early_rmse, beta, lam)):
        return None
    if not all(math.isfinite(v) for v in (rmse, late_rmse, early_rmse, beta, lam)):
        return None
    if beta < 0 or lam < 0 or rmse < 0 or late_rmse < 0 or early_rmse < 0:
        return None
    try:
        return rmse + beta * late_rmse + lam * early_rmse
    except (TypeError, ValueError, OverflowError):
        return None
