"""SMSCP absolute nonconformity score from Han and Lin arXiv:2610.19484 eq (1).

Printed: R_t = |Y_t - \hat{\mu}_t|

Fail-closed: invalid inputs return None.
"""
from __future__ import annotations

import math
from typing import Optional


def smscp_nonconformity(y: object, mu_hat: object) -> Optional[float]:
    """Guarded absolute residual nonconformity. Printed R = |Y - mu_hat|."""
    try:
        yf = float(y)
        mf = float(mu_hat)
        if not (math.isfinite(yf) and math.isfinite(mf)):
            return None
        return abs(yf - mf)
    except (TypeError, ValueError):
        return None
