def conformal_softmax_nonconformity(fhat_true_class):
    """Guarded softmax non-conformity score from Angelopoulos & Bates arXiv:2107.07511.
    Printed: s_i = 1 - \hat{f}(X_i)_{Y_i}
    Fail-closed: returns None on invalid input.
    """
    try:
        f = float(fhat_true_class)
        if not (0.0 <= f <= 1.0):
            return None
        return 1.0 - f
    except (TypeError, ValueError):
        return None
