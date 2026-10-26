def ogd_quantile_tracking(theta, residual, alpha, eta):
    """Guarded OGD quantile tracking update from Chrétien et al. arXiv:2610.27740 eq (4).
    theta_{t+1} = max(0, theta_t + eta * pinball subgradient).
    Fail-closed: returns None on invalid input.
    """
    try:
        theta = float(theta)
        residual = float(residual)
        alpha = float(alpha)
        eta = float(eta)
        if not (0.0 < alpha < 1.0) or eta < 0.0:
            return None
        subgrad = (1.0 - alpha) if residual > theta else -alpha
        return max(0.0, theta + eta * subgrad)
    except (TypeError, ValueError):
        return None
