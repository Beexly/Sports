def conformal_set_loss_lambda(y, gamma, lam):
    """Guarded conformal set loss from Zhang Bates arXiv:2610.08785 eq (5).
    ell_lambda(Y, Gamma) = |Gamma| + (1/lambda) * 1(Y notin Gamma)
    Fail-closed: returns None on invalid input.
    """
    try:
        if not isinstance(gamma, (list, set, tuple)):
            return None
        gamma_set = set(gamma)
        size = len(gamma_set)
        lam_f = float(lam)
        if lam_f <= 0 or lam_f > 1:
            return None
        indicator = 0.0 if y in gamma_set else 1.0
        return size + (1.0 / lam_f) * indicator
    except (TypeError, ValueError):
        return None
