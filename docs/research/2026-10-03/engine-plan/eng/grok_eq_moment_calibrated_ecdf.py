def moment_calibrated_ecdf(weights, scores, q):
    """Guarded weighted empirical CDF F_w(q) = sum w_i * 1(S_i <= q) from Wang et al. arXiv:2610.15268.
    Fail-closed: returns None on invalid input.
    """
    try:
        if not isinstance(weights, (list, tuple)) or not isinstance(scores, (list, tuple)):
            return None
        if len(weights) != len(scores):
            return None
        qf = float(q)
        total = 0.0
        for w, s in zip(weights, scores):
            wf = float(w)
            sf = float(s)
            if sf <= qf:
                total += wf
        return total
    except (TypeError, ValueError):
        return None
