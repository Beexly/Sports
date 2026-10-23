def l1_nonconformity(y, yhat):
    """Guarded L1 nonconformity from CoCoNet arXiv:2610.24246 printed example.
    S(x, r) = ||r||_1 where r = y - yhat.
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
        return sum(abs(a - b) for a, b in zip(ys, yhs))
    except (TypeError, ValueError, OverflowError):
        return None
