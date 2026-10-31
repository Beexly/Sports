"""Pinball loss for TTA quantile regression as printed in Gutiérrez-Pérez & Agudo, arXiv:2610.36183 eq (3).

L_tau(y_hat, y) = tau*(y - y_hat) if y >= y_hat else (1-tau)*(y_hat - y)
Fail-closed on bad inputs. Does not score or write mind.
"""
from __future__ import annotations

import math


def tta_pinball_loss(y_hat: float | None, y: float | None, tau: float | None = 0.01) -> float | None:
    if y_hat is None or y is None or tau is None:
        return None
    try:
        yh = float(y_hat)
        yt = float(y)
        t = float(tau)
        if not (math.isfinite(yh) and math.isfinite(yt) and math.isfinite(t)):
            return None
        if not (0.0 < t < 1.0):
            return None
        if yt >= yh:
            return t * (yt - yh)
        else:
            return (1.0 - t) * (yh - yt)
    except (TypeError, ValueError, OverflowError):
        return None
