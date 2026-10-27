def coconet_region_membership(score, tau):
    """Guarded membership check of printed eq (2) from Moradi et al. arXiv:2610.24246v1.
    Region membership if S <= tau. Returns True if score <= tau, False if not, None on non-numeric/non-finite.
    Fail-closed.
    """
    import math
    try:
        s = float(score)
        t = float(tau)
        if not (math.isfinite(s) and math.isfinite(t)):
            return None
        return s <= t
    except (TypeError, ValueError, OverflowError):
        return None
