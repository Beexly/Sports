def weighted_randomized_conformal_inclusion(A_s, B_s, W_x, alpha, U):
    """Guarded weighted randomized conformal inclusion from arXiv:2610.37866 eq (5).
    C_s membership: (A_s + U * B_s) / W_x > alpha.
    Returns True/False or None on fail-closed.
    """
    import math
    try:
        a = float(A_s)
        b = float(B_s)
        w = float(W_x)
        al = float(alpha)
        u = float(U)
        if not all(math.isfinite(v) for v in (a, b, w, al, u)):
            return None
        if w <= 0 or not (0 <= al <= 1) or not (0 <= u <= 1):
            return None
        return (a + u * b) / w > al
    except (TypeError, ValueError, OverflowError):
        return None
