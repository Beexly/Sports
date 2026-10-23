def expected_local_radius(distances, beta):
    """Guarded expected local radius (ELR) from Qiu et al. arXiv:2610.31336 printed equation.
    R_β(ω) := (1/β) ∫_0^β Q(ω, τ) dτ
    Empirical version: Riemann sum on sorted non-negative finite distances.
    Fail-closed: returns None on invalid beta, empty/non-numeric/negative/non-finite distances.
    """
    import math
    try:
        if not isinstance(beta, (int, float)):
            return None
        b = float(beta)
        if not (math.isfinite(b) and 0.0 < b <= 1.0):
            return None
        if distances is None or not hasattr(distances, "__iter__"):
            return None
        ds = []
        for v in distances:
            if not isinstance(v, (int, float)):
                return None
            fv = float(v)
            if not (math.isfinite(fv) and fv >= 0.0):
                return None
            ds.append(fv)
        n = len(ds)
        if n == 0:
            return None
        ds.sort()
        integral = 0.0
        for i in range(n):
            tau = (i + 1) / n
            if tau > b:
                break
            integral += ds[i] * (1.0 / n)
        return integral / b
    except (TypeError, ValueError, OverflowError, ZeroDivisionError):
        return None
