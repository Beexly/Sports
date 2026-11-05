def orthogonal_basis_conformal_score(theta_f, a, w, g=None):
    """Guarded orthogonal basis conformal score from Tran et al. arXiv:2611.06320.
    Core of eq for E(X0): g(W^{1/2} (theta(f(X0)) - a)).
    Default g is Euclidean norm of the weighted residual.
    Fail-closed on non-finite, length mismatch, or non-positive W.
    """
    import math
    try:
        if not (isinstance(theta_f, (list, tuple)) and isinstance(a, (list, tuple)) and isinstance(w, (list, tuple))):
            return None
        n = len(theta_f)
        if n == 0 or len(a) != n or len(w) != n:
            return None
        residuals = []
        for tf, ai, wi in zip(theta_f, a, w):
            tff = float(tf)
            aif = float(ai)
            wif = float(wi)
            if not (math.isfinite(tff) and math.isfinite(aif) and math.isfinite(wif) and wif > 0):
                return None
            residuals.append(math.sqrt(wif) * (tff - aif))
        if g is None:
            # default Euclidean
            return math.sqrt(sum(r*r for r in residuals))
        else:
            try:
                return float(g(residuals))
            except Exception:
                return None
    except (TypeError, ValueError, OverflowError):
        return None
