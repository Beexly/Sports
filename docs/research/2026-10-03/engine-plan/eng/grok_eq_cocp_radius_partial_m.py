def cocp_radius_partial_m(f_plus, f_minus):
    """Guarded CoCP radius gradient partial from Su et al. 2026 arXiv:2603.01719 eq (2).
    partial phi_beta / partial m = - (f_beta(m+phi) - f_beta(m-phi)) / (f_beta(m+phi) + f_beta(m-phi))
    Fail-closed on non-finite, non-positive densities, or zero denominator.
    """
    import math
    try:
        fp = float(f_plus)
        fm = float(f_minus)
        if not (math.isfinite(fp) and math.isfinite(fm)):
            return None
        if fp <= 0 or fm <= 0:
            return None
        denom = fp + fm
        if denom == 0:
            return None
        return - (fp - fm) / denom
    except (TypeError, ValueError, OverflowError):
        return None
