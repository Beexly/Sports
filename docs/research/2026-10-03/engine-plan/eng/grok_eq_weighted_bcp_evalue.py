def weighted_bcp_evalue(s_test, s_cal, w_cal, w_test):
    """Guarded weighted e-value from Meghrazi Li arXiv:2610.16048 Definition 2.
    E^{(w)}(y) = W * S(X_{n+1}, y) / (sum w_i S_i + w_{n+1} S(X_{n+1}, y))
    where W = sum_{j=1}^{n+1} w_j
    Fail-closed: returns None on invalid input.
    """
    try:
        s_t = float(s_test)
        w_t = float(w_test)
        if not isinstance(s_cal, (list, tuple)) or not isinstance(w_cal, (list, tuple)):
            return None
        if len(s_cal) != len(w_cal):
            return None
        s_c = [float(x) for x in s_cal]
        w_c = [float(x) for x in w_cal]
        if any(x < 0 for x in s_c + [s_t]) or any(x <= 0 for x in w_c + [w_t]):
            return None
        sum_w_s = sum(wi * si for wi, si in zip(w_c, s_c))
        denom = sum_w_s + w_t * s_t
        if denom == 0:
            return None
        W = sum(w_c) + w_t
        return (W * s_t) / denom
    except (TypeError, ValueError, ZeroDivisionError):
        return None
