def schur_concave_inequality(c_xy, c_mixed):
    """Guarded Schur concavity check from Trutschnig Úbeda-Flores arXiv:2610.33646 printed eq (5).
    Returns True if C(x,y) <= C(mixed), False if violated, None on non-numeric/non-finite.
    Fail-closed.
    """
    import math
    try:
        a = float(c_xy)
        b = float(c_mixed)
        if not (math.isfinite(a) and math.isfinite(b)):
            return None
        return a <= b
    except (TypeError, ValueError, OverflowError):
        return None
