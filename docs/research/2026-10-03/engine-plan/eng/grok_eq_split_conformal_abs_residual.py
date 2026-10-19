def split_conformal_abs_residual(y, mu):
    """Guarded absolute residual nonconformity from Zhang, Zhang & He arXiv:2610.15458 eq R_A(x,y) := |y - mu(x;A)|.
    Fail-closed: returns None on invalid input.
    """
    try:
        return abs(float(y) - float(mu))
    except (TypeError, ValueError):
        return None
