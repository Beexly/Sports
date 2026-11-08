def cgrpo_advantage(r_i, rewards, epsilon=1e-8):
    """Guarded GRPO advantage from arXiv 2611.05591 eq (1).
    A_hat_i = (r_i - r_bar) / (sigma_r + epsilon)
    Fail-closed on non-finite, non-numeric, empty, or invalid domain.
    """
    import math
    try:
        ri = float(r_i)
        if not math.isfinite(ri):
            return None
        rs = [float(x) for x in rewards]
        if not rs or any(not math.isfinite(x) for x in rs):
            return None
        n = len(rs)
        if n < 1:
            return None
        r_bar = sum(rs) / n
        var = sum((x - r_bar) ** 2 for x in rs) / n
        sigma = math.sqrt(var) if var >= 0 else 0.0
        eps = float(epsilon)
        if not math.isfinite(eps) or eps <= 0:
            return None
        denom = sigma + eps
        if denom == 0:
            return None
        return (ri - r_bar) / denom
    except (TypeError, ValueError, OverflowError, ZeroDivisionError):
        return None
