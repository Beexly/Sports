def weighted_randomized_conformal_membership(A, B, W, alpha, U):
    """Guarded weighted randomized conformal membership from Li arXiv:2610.37866 eq (5).
    C_s membership: (A + U * B) / W > alpha.
    Fail-closed on non-finite, non-numeric, or invalid weights/probability.
    """
    import math
    try:
        aa = float(A)
        bb = float(B)
        ww = float(W)
        al = float(alpha)
        uu = float(U)
        if not (math.isfinite(aa) and math.isfinite(bb) and math.isfinite(ww) and
                math.isfinite(al) and math.isfinite(uu)):
            return None
        if ww <= 0 or not (0 <= al <= 1) or not (0 <= uu <= 1) or bb < 0 or aa < 0:
            return None
        return (aa + uu * bb) / ww > al
    except (TypeError, ValueError, OverflowError):
        return None
