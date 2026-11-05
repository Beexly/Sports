def equilibrium_valid_coverage(coverage_prob, alpha):
    """Guarded equilibrium-valid coverage check from Mahrous Di Pietro arXiv:2611.05277 eq (1).
    P(Y in C(X)) >= 1 - alpha under D(f*).
    Fail-closed on non-finite, out-of-range inputs.
    Returns True if the inequality holds, None otherwise.
    """
    import math
    try:
        p = float(coverage_prob)
        a = float(alpha)
        if not (math.isfinite(p) and math.isfinite(a)):
            return None
        if not (0.0 <= p <= 1.0 and 0.0 < a < 1.0):
            return None
        return p >= (1.0 - a)
    except (TypeError, ValueError, OverflowError):
        return None
