"""SCOPE density nonconformity from Moslemi et al arXiv:2610.17146 printed rho_theta(x,y) = -log p_theta(y|x).

Fail-closed: invalid inputs return None.
"""
from __future__ import annotations

import math
from typing import Optional


def scope_density_nonconformity(p: object) -> Optional[float]:
    """Guarded -log density nonconformity. Printed rho = -log p."""
    try:
        pf = float(p)
        if not math.isfinite(pf) or pf <= 0.0:
            return None
        return -math.log(pf)
    except (TypeError, ValueError):
        return None
