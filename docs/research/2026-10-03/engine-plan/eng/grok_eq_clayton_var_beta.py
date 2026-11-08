def clayton_var_beta(u, alpha, theta, d):
    """Guarded Clayton multivariate VaR beta kernel from arXiv 2602.01245 eq (6) / proof.
    beta ~ u^{-theta-1} * (alpha^{-theta} - u^{-theta})^{d-2}
    Fail-closed on non-finite, non-numeric, or invalid domain.
    """
    import math
    try:
        uu = float(u)
        aa = float(alpha)
        th = float(theta)
        dd = int(d)
        if not (math.isfinite(uu) and math.isfinite(aa) and math.isfinite(th)):
            return None
        if not (0 < uu < 1) or not (0 < aa < 1) or th <= 0 or dd < 2:
            return None
        if uu < aa:
            return None
        base = aa ** (-th) - uu ** (-th)
        if base < 0:
            return None
        return (uu ** (-th - 1)) * (base ** (dd - 2))
    except (TypeError, ValueError, OverflowError):
        return None
