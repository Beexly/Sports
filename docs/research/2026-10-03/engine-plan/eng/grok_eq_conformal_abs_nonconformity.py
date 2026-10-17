def conformal_abs_nonconformity(y, y_hat):
    """Guarded absolute non-conformity score from Messoudi et al. arXiv:2101.12002 eq (2).
    Fail-closed: returns None on invalid input.
    """
    try:
        return abs(float(y) - float(y_hat))
    except (TypeError, ValueError):
        return None
