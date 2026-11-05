def scaling_score_conformal(e, b):
    """Guarded scaling score from Rousseau Messoudi arXiv:2609.17091 eq (1).
    sigma(e; b) = max_k e(k) / b(k).
    Fail-closed on non-finite, non-positive b, or length mismatch.
    """
    import math
    try:
        if not (isinstance(e, (list, tuple)) and isinstance(b, (list, tuple))):
            return None
        if len(e) != len(b) or len(e) == 0:
            return None
        ratios = []
        for ek, bk in zip(e, b):
            ekf = float(ek)
            bkf = float(bk)
            if not (math.isfinite(ekf) and math.isfinite(bkf) and bkf > 0 and ekf >= 0):
                return None
            ratios.append(ekf / bkf)
        return max(ratios) if ratios else None
    except (TypeError, ValueError, OverflowError):
        return None
