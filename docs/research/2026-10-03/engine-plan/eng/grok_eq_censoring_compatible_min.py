def censoring_compatible_min(xs):
    """Guarded censoring-compatible reduction from Bladt arXiv:2610.24911 printed eq (4).
    s(x) = min_j ψ_j(x^{(j)}) with identity ψ; returns min of finite numeric coordinates.
    Fail-closed on empty, non-numeric, or non-finite inputs.
    """
    import math
    if not xs or not hasattr(xs, '__iter__'):
        return None
    try:
        vals = [float(x) for x in xs]
        if not vals or not all(math.isfinite(v) for v in vals):
            return None
        return min(vals)
    except (TypeError, ValueError, OverflowError):
        return None
