def conformal_residual_score(y, yhat):
    """Guarded residual score from Barber & Tibshirani arXiv:2504.02292 eq (1).
    s((x, y), ...) = ell(y, fhat(x)) with ell absolute residual.
    Fail-closed on non-finite or non-numeric inputs.
    """
    import math
    try:
        yy = float(y)
        yh = float(yhat)
        if not (math.isfinite(yy) and math.isfinite(yh)):
            return None
        return abs(yy - yh)
    except (TypeError, ValueError, OverflowError):
        return None
