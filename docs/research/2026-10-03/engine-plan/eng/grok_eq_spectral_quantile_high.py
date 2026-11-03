def spectral_quantile_high(x_mean, alpha, d_hi, h_tilde):
    """Guarded spectral quantile high from arXiv:2611.00231 eq (6).
    x_hi^d(τ) = x_mean^d(τ) + α * ReLU(D_θ^hi * h~(τ)).
    Fail-closed on non-finite or non-numeric inputs.
    """
    import math
    try:
        xm = float(x_mean)
        a = float(alpha)
        d = float(d_hi)
        h = float(h_tilde)
        if not (math.isfinite(xm) and math.isfinite(a) and math.isfinite(d) and math.isfinite(h)):
            return None
        if a < 0:
            return None
        relu = max(0.0, d * h)
        return xm + a * relu
    except (TypeError, ValueError, OverflowError):
        return None
