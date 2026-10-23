def euclidean_nonconformity(y, yhat):
    """Guarded Euclidean nonconformity from Sun & Yu arXiv:2212.03281 eq (2).
    A = ||y - \hat{y}||_2.
    Fail-closed on non-finite or non-numeric inputs.
    Supports scalars or equal-length sequences.
    """
    import math
    try:
        if isinstance(y, (int, float)) and isinstance(yhat, (int, float)):
            yy = float(y)
            yh = float(yhat)
            if not (math.isfinite(yy) and math.isfinite(yh)):
                return None
            return abs(yy - yh)
        ys = [float(v) for v in y]
        yhs = [float(v) for v in yhat]
        if len(ys) != len(yhs):
            return None
        if not all(math.isfinite(v) for v in ys + yhs):
            return None
        return math.sqrt(sum((a - b) ** 2 for a, b in zip(ys, yhs)))
    except (TypeError, ValueError, OverflowError):
        return None
