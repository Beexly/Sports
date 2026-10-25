def conformal_p_function(test_score, reference_scores):
    """Guarded conformal p-function from Sesia & Favaro arXiv:2603.23923 eq (5).
    p = [1 + sum I(s((X,y); D) <= s(Z_i; D))] / (1 + n)
    Fail-closed on non-finite or non-numeric inputs.
    """
    import math
    try:
        ts = float(test_score)
        if not math.isfinite(ts):
            return None
        if reference_scores is None:
            return None
        refs = []
        for r in reference_scores:
            rr = float(r)
            if not math.isfinite(rr):
                return None
            refs.append(rr)
        n = len(refs)
        count = sum(1 for r in refs if ts <= r)
        return (1 + count) / (1 + n)
    except (TypeError, ValueError, OverflowError):
        return None
