def performative_equilibrium_coverage(alpha, L, eps):
    """Guarded equilibrium-valid coverage lower bound from arXiv:2611.05277 eq (1) + transfer.
    Under L-sensitivity, transfer gives coverage >= 1 - alpha - L*eps.
    Fail-closed on invalid inputs.
    """
    import math
    try:
        a = float(alpha)
        ll = float(L)
        e = float(eps)
        if not (math.isfinite(a) and 0 < a < 1):
            return None
        if not (math.isfinite(ll) and ll >= 0):
            return None
        if not (math.isfinite(e) and e >= 0):
            return None
        bound = 1.0 - a - ll * e
        if not math.isfinite(bound):
            return None
        return max(0.0, bound)  # coverage can't be negative
    except (TypeError, ValueError, OverflowError):
        return None
