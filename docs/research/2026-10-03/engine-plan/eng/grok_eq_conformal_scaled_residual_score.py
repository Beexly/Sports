def conformal_scaled_residual_score(y, mu, v):
    """Guarded scaled residual score from Choi arXiv:2610.34204 eq (12).
    s(x, y) = |y - mu_pred(x)| / sqrt(v_pred(x)).
    Fail-closed on non-finite, non-positive variance, or non-numeric inputs.
    """
    import math
    try:
        yy = float(y)
        m = float(mu)
        vv = float(v)
        if not (math.isfinite(yy) and math.isfinite(m) and math.isfinite(vv)):
            return None
        if vv <= 0:
            return None
        return abs(yy - m) / math.sqrt(vv)
    except (TypeError, ValueError, OverflowError):
        return None
