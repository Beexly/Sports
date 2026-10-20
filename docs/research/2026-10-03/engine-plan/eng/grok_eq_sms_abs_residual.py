def sms_abs_residual(y, mu):
    """Guarded absolute residual nonconformity from Han Lin arXiv:2610.19484 eq (1).
    R_t = |Y_t - mu_hat_t|
    Fail-closed: returns None on invalid input.
    """
    try:
        y_f = float(y)
        mu_f = float(mu)
        return abs(y_f - mu_f)
    except (TypeError, ValueError):
        return None
