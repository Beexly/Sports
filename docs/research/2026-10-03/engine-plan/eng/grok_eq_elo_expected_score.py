def elo_expected_score(r_a, r_b):
    """Guarded Elo expected score from Holý & Černý arXiv:2604.09143 eq (4).
    E[Y_t^{(A)} | r_t^{(A)}, r_t^{(B)}] = 1 / (1 + 10^{-(r_A - r_B)/400}).
    Fail-closed on non-finite or non-numeric inputs.
    """
    import math
    try:
        ra = float(r_a)
        rb = float(r_b)
        if not (math.isfinite(ra) and math.isfinite(rb)):
            return None
        diff = ra - rb
        return 1.0 / (1.0 + 10 ** (-diff / 400.0))
    except (TypeError, ValueError, OverflowError):
        return None
