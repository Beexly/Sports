def del_recalibrated_p(test_f, reference_fs):
    """Guarded data-enhanced localized recalibrated conformal p-value from arXiv:2610.34999 eq (3).
    p = [1 + sum I(F_i* <= F_n+1*)] / (1 + n)
    Fail-closed on non-finite or non-numeric inputs.
    """
    import math
    try:
        tf = float(test_f)
        if not math.isfinite(tf):
            return None
        if reference_fs is None:
            return None
        refs = []
        for r in reference_fs:
            rr = float(r)
            if not math.isfinite(rr):
                return None
            refs.append(rr)
        n = len(refs)
        count = sum(1 for r in refs if r <= tf)
        return (1 + count) / (1 + n)
    except (TypeError, ValueError, OverflowError):
        return None
