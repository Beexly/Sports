def absolute_residual_nonconformity(y, yhat):
    """Guarded absolute residual nonconformity from Messoudi et al. arXiv:2101.12002 eq (2).
    \alpha_i = |y_i - \hat{y}_i|.
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
