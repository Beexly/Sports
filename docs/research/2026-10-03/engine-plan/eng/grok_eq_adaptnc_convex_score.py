def adaptnc_convex_nonconformity_score(residual, A, b):
    """Guarded AdaptNC convex template nonconformity score from arXiv:2602.01629.
    s(X, y; theta) = max_j (A_j @ (y - h(X)) - b_j)
    Fail-closed on non-finite, non-numeric, or shape mismatch.
    """
    import math
    try:
        if not isinstance(residual, (list, tuple)):
            return None
        if not isinstance(A, (list, tuple)):
            return None
        if not isinstance(b, (list, tuple)):
            return None
        p = len(residual)
        r = len(A)
        if p == 0 or r == 0 or len(b) != r:
            return None
        max_val = None
        for j in range(r):
            row = A[j]
            if not isinstance(row, (list, tuple)) or len(row) != p:
                return None
            dot = 0.0
            for i in range(p):
                a = float(row[i])
                res = float(residual[i])
                if not (math.isfinite(a) and math.isfinite(res)):
                    return None
                dot += a * res
            bj = float(b[j])
            if not math.isfinite(bj):
                return None
            val = dot - bj
            if not math.isfinite(val):
                return None
            if max_val is None or val > max_val:
                max_val = val
        return max_val
    except (TypeError, ValueError, OverflowError, IndexError):
        return None
