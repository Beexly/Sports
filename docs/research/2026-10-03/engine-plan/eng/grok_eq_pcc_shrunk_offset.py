"""Predicted Class Correction shrunk offset as printed in Octadion et al., arXiv:2610.25349 eq (5).

delta_tilde_y = lambda * g_theta(phi(y))
Fail-closed on bad inputs. Does not score or write mind.
"""
from __future__ import annotations

import math


def pcc_shrunk_offset(g_theta_phi: float | None, lambda_val: float | None) -> float | None:
    if g_theta_phi is None or lambda_val is None:
        return None
    try:
        g = float(g_theta_phi)
        lam = float(lambda_val)
        if not (math.isfinite(g) and math.isfinite(lam)):
            return None
        if not (0.0 <= lam <= 1.0):
            return None
        return lam * g
    except (TypeError, ValueError, OverflowError):
        return None
