def conformal_weighted_randomized_include(scores, weights, candidate_score, u, alpha, candidate_weight):
    """Guarded weighted randomized conformal inclusion from arXiv:2610.37866 eq (5).
    C_s includes y if (A_s + U * B_s) / W_x > alpha,
    where A_s = sum w_i 1{s_i > s(x,y)}, B_s = w(x) + sum w_i 1{s_i = s(x,y)}, W_x = sum w_i + w(x).
    Fail-closed on non-finite, non-numeric, length mismatch, u not in [0,1], alpha not in (0,1), non-positive weights.
    Returns bool or None.
    """
    import math
    try:
        if not isinstance(scores, (list, tuple)) or not isinstance(weights, (list, tuple)):
            return None
        n = len(scores)
        if n == 0 or len(weights) != n:
            return None
        if not (isinstance(u, (int, float)) and 0 <= float(u) <= 1 and math.isfinite(float(u))):
            return None
        if not (isinstance(alpha, (int, float)) and 0 < float(alpha) < 1 and math.isfinite(float(alpha))):
            return None
        if not (isinstance(candidate_score, (int, float)) and math.isfinite(float(candidate_score))):
            return None
        if not (isinstance(candidate_weight, (int, float)) and float(candidate_weight) > 0 and math.isfinite(float(candidate_weight))):
            return None
        A = 0.0
        B = float(candidate_weight)
        W = float(candidate_weight)
        for i in range(n):
            s = float(scores[i])
            w = float(weights[i])
            if not (math.isfinite(s) and math.isfinite(w) and w >= 0):
                return None
            W += w
            if s > float(candidate_score):
                A += w
            elif abs(s - float(candidate_score)) < 1e-12:  # numerical equality
                B += w
        if W <= 0 or not math.isfinite(W):
            return None
        val = (A + float(u) * B) / W
        if not math.isfinite(val):
            return None
        return val > float(alpha)
    except (TypeError, ValueError, OverflowError, IndexError):
        return None
