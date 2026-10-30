def conformal_mahalanobis_score(residual, sigma_inv_sqrt):
    """Guarded Mahalanobis nonconformity score from arXiv:2507.20941 eq for S_Mah.
    S_Mah(X, Y) = || Sigma^{-1/2} (Y - f(X)) ||_2
    Fail-closed on non-finite, non-numeric, or shape mismatch.
    """
    import math
    try:
        if not isinstance(residual, (list, tuple)):
            return None
        if not isinstance(sigma_inv_sqrt, (list, tuple)):
            return None
        n = len(residual)
        if n == 0 or len(sigma_inv_sqrt) != n:
            return None
        for row in sigma_inv_sqrt:
            if not isinstance(row, (list, tuple)) or len(row) != n:
                return None
        # Compute Sigma^{-1/2} @ residual
        whitened = []
        for i in range(n):
            s = 0.0
            for j in range(n):
                a = float(sigma_inv_sqrt[i][j])
                b = float(residual[j])
                if not (math.isfinite(a) and math.isfinite(b)):
                    return None
                s += a * b
            whitened.append(s)
        # L2 norm
        norm_sq = 0.0
        for w in whitened:
            if not math.isfinite(w):
                return None
            norm_sq += w * w
        return math.sqrt(norm_sq)
    except (TypeError, ValueError, OverflowError, IndexError):
        return None
