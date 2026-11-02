def transformation_based_coverage_violation(empirical_coverages, alpha):
    """Guarded T-CV from Jang and Lee arXiv:2511.11472 eq (3).
    T-CV = max_b | (sum I(y in C)/|I_b| - (1-alpha) ) |.
    Fail-closed on non-finite, non-numeric, or empty inputs.
    """
    import math
    try:
        if not empirical_coverages or not isinstance(empirical_coverages, (list, tuple)):
            return None
        a = float(alpha)
        if not (math.isfinite(a) and 0 <= a <= 1):
            return None
        target = 1.0 - a
        max_dev = 0.0
        for cov in empirical_coverages:
            c = float(cov)
            if not math.isfinite(c) or not (0 <= c <= 1):
                return None
            max_dev = max(max_dev, abs(c - target))
        return max_dev
    except (TypeError, ValueError, OverflowError):
        return None
