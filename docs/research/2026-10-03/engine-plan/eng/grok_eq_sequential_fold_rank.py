"""Sequential fold rank index from Yang et al. arXiv:2610.12937 eq (3).

Printed: r_k = ceil( (M_k + 1) * beta_k )

Fail-closed: invalid inputs return None.
"""
from __future__ import annotations

import math
from typing import Optional


def sequential_fold_rank(m_k: object, beta_k: object) -> Optional[int]:
    """Guarded rank index. Printed r_k = ceil((M_k + 1) * beta_k)."""
    try:
        if not (isinstance(m_k, int) and m_k >= 0):
            return None
        if not (isinstance(beta_k, (int, float)) and 0.0 < float(beta_k) <= 1.0 and math.isfinite(float(beta_k))):
            return None
        raw = (m_k + 1) * float(beta_k)
        if not math.isfinite(raw):
            return None
        r = math.ceil(raw)
        if r < 1 or r > m_k + 1:
            return None
        return int(r)
    except (TypeError, ValueError, OverflowError):
        return None
