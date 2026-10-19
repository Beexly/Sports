def weighted_bcp_evalue(W, S_test, sum_w_S, w_test, S_test_again):
    """Guarded weighted e-value from Meghrazi & Li arXiv:2610.16048 Definition 2.
    E^{(w)}(y) := W * S(X_{n+1}, y) / (sum_{i=1}^n w_i S_i + w_{n+1} S(X_{n+1}, y))
    Fail-closed: returns None on invalid or non-positive denominator.
    """
    try:
        num = float(W) * float(S_test)
        den = float(sum_w_S) + float(w_test) * float(S_test_again)
        if den <= 0.0 or not (num == num and den == den):  # nan check
            return None
        return num / den
    except (TypeError, ValueError):
        return None
