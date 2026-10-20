def score_driven_rating_update(rating, score, K=16.0):
    """Guarded score-driven rating update from Holý & Černý arXiv:2604.09143.
    Printed eq (6): r_{t+1}^{(i)} = r_t^{(i)} + K \nabla_i(r_t; y_t)
    Fail-closed: returns None on invalid input.
    """
    try:
        r = float(rating)
        s = float(score)
        k = float(K)
        if k <= 0.0 or not all(abs(x) < 1e9 for x in (r, s, k)):
            return None
        return r + k * s
    except (TypeError, ValueError):
        return None
