def vine_copula_h(u, v, theta=0.0, family="independence"):
    """Guarded h-function from Online Conditional Vine Copulas arXiv:2610.23119.
    h(u, v; theta) := partial C(u, v; theta) / partial v.
    Implements independence (theta ignored) and Clayton (theta > 0).
    Fail-closed on non-finite, out-of-range, or unsupported inputs.
    """
    import math
    try:
        uu = float(u)
        vv = float(v)
        th = float(theta)
        if not (math.isfinite(uu) and math.isfinite(vv) and math.isfinite(th)):
            return None
        if not (0.0 < uu < 1.0 and 0.0 < vv < 1.0):
            return None
        if family == "independence":
            return uu
        if family == "clayton":
            if th <= 0:
                return None
            # h(u|v) = v^{-(theta+1)} * (u^{-theta} + v^{-theta} - 1)^{-(theta+1)/theta}
            term = uu ** (-th) + vv ** (-th) - 1.0
            if term <= 0:
                return None
            return (vv ** (-(th + 1))) * (term ** (-(th + 1) / th))
        return None
    except (TypeError, ValueError, OverflowError, ZeroDivisionError):
        return None
