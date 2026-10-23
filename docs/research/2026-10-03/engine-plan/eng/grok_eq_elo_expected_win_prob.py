def elo_expected_win_prob(r_a, r_b, scale=400.0):
    """Guarded Elo expected win probability from Holý & Černý arXiv:2604.09143 eq (4).
    P[Y^{(A)}=1 | rA, rB] = 1 / (1 + 10^{-(rA - rB)/scale}).
    Fail-closed on non-finite or non-numeric inputs.
    """
    import math
    try:
        ra = float(r_a)
        rb = float(r_b)
        sc = float(scale)
        if not (math.isfinite(ra) and math.isfinite(rb) and math.isfinite(sc) and sc != 0):
            return None
        diff = (ra - rb) / sc
        return 1.0 / (1.0 + 10.0 ** (-diff))
    except (TypeError, ValueError, OverflowError):
        return None
