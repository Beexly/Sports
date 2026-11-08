def cop_optimistic_update(f_t, q_t, sigma, eta_t, err_t, alpha):
    """Guarded update from Hu et al. arXiv:2512.07770 eq (12).
    F_{t+1}(q_{t+1}) + sigma * q_{t+1} = F_t(q_t) + sigma * q_t + eta_t * (err_t - alpha)
    Fail-closed on bad inputs. Returns the left-hand side value or None.
    """
    import math
    try:
        f_t = float(f_t)
        q_t = float(q_t)
        sigma = float(sigma)
        eta_t = float(eta_t)
        err_t = float(err_t)
        alpha = float(alpha)
        if not all(math.isfinite(x) for x in [f_t, q_t, sigma, eta_t, err_t, alpha]):
            return None
        if sigma < 0 or eta_t < 0 or not (0 <= alpha <= 1) or not (0 <= err_t <= 1):
            return None
        rhs = f_t + sigma * q_t + eta_t * (err_t - alpha)
        return rhs  # the equality value that next F + sigma q should match
    except Exception:
        return None
