def score_driven_rating_update(r, K, score):
    """Guarded score-driven rating update from Holý & Černý arXiv:2604.09143 eq (6).
    r_{t+1}^{(i)} = r_t^{(i)} + K * nabla_i(r_t; y_t).
    Fail-closed on non-finite or non-numeric inputs.
    """
    import math
    try:
        rr = float(r)
        kk = float(K)
        sc = float(score)
        if not (math.isfinite(rr) and math.isfinite(kk) and math.isfinite(sc)):
            return None
        if kk <= 0:
            return None
        return rr + kk * sc
    except (TypeError, ValueError, OverflowError):
        return None
