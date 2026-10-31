import math

def score_driven_rating_update(r_t, K, nabla):
    """Guarded score-driven rating update from Holý & Černý arXiv:2604.09143 eq (6).
    r_{t+1} = r_t + K * nabla. Fail-closed: returns None on invalid input.
    """
    try:
        r = float(r_t)
        k = float(K)
        n = float(nabla)
        if k <= 0 or not (math.isfinite(r) and math.isfinite(k) and math.isfinite(n)):
            return None
        return r + k * n
    except (TypeError, ValueError):
        return None
