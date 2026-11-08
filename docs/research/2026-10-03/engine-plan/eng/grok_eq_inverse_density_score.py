def inverse_density_score(density):
    """Guarded inverse conditional density score s*(x,y) = 1/f(y|x)
    from arXiv 2610.37866 (Li 2026) oracle score under covariate shift.
    Fail-closed on non-finite, non-positive, or non-numeric density.
    """
    import math
    try:
        d = float(density)
        if not math.isfinite(d) or d <= 0:
            return None
        return 1.0 / d
    except (TypeError, ValueError, OverflowError):
        return None
