def copula_fourier_q(thetas):
    """Guarded Q = sum theta_kl**2 from arXiv:2610.09351 eq (2.6).
    Fail-closed: returns None on invalid input.
    """
    try:
        if not isinstance(thetas, (list, tuple)):
            return None
        total = 0.0
        for th in thetas:
            tf = float(th)
            total += tf * tf
        return total
    except (TypeError, ValueError):
        return None
