def conformal_split_quantile(residuals, alpha):
    """Guarded split conformal quantile from Shaikh 2026 SportRxiv eq (2).
    qhat = Quantile(residuals, ceil((1-alpha)*(n+1))/n )
    Fail-closed on empty, non-finite, or invalid alpha.
    """
    import math
    try:
        if not residuals or not isinstance(residuals, (list, tuple)):
            return None
        n = len(residuals)
        if n == 0:
            return None
        a = float(alpha)
        if not (math.isfinite(a) and 0 < a < 1):
            return None
        finite_res = []
        for r in residuals:
            rr = float(r)
            if not math.isfinite(rr):
                return None
            finite_res.append(rr)
        finite_res.sort()
        level = math.ceil((1 - a) * (n + 1)) / n
        if level > 1:
            level = 1.0
        idx = min(int(math.ceil(level * n) - 1), n - 1)
        return finite_res[idx]
    except (TypeError, ValueError, OverflowError):
        return None
