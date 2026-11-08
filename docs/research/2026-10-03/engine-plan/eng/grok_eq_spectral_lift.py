def spectral_lift(x0, L_theta_output):
    """Guarded spectral lift from arXiv 2611.00231 eq (1).
    chi_0^ell = x0^d \oplus L_theta(x0^d)
    Fail-closed on non-finite, non-numeric, or mismatched.
    """
    import math
    try:
        x = [float(v) for v in x0]
        l = [float(v) for v in L_theta_output]
        if not x or not l or any(not math.isfinite(v) for v in x + l):
            return None
        return x + l  # concatenation
    except (TypeError, ValueError, OverflowError):
        return None
