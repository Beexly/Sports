def survival_copula(u, v, c_at_complement):
    """Guarded survival copula \widehat{C}(u,v) = u + v - 1 + C(1-u, 1-v) from arXiv:2610.16631.
    Fail-closed: returns None on invalid input.
    """
    try:
        uf = float(u)
        vf = float(v)
        cf = float(c_at_complement)
        if not (0.0 <= uf <= 1.0 and 0.0 <= vf <= 1.0 and 0.0 <= cf <= 1.0):
            return None
        result = uf + vf - 1.0 + cf
        if not (0.0 <= result <= 1.0):
            return None
        return result
    except (TypeError, ValueError):
        return None
