def wasserstein_copula_bound(observed_w2_sq):
    """Guarded Wasserstein copula bound from Ansari arXiv:2609.23940.
    Printed eq (3): \mathcal{W}_2^2(C, \Pi) \leq 1/10
    Fail-closed: returns None on invalid input; True if bound holds, False otherwise.
    """
    try:
        w = float(observed_w2_sq)
        if not (0.0 <= w < 1e9):
            return None
        return w <= 0.1
    except (TypeError, ValueError):
        return None
