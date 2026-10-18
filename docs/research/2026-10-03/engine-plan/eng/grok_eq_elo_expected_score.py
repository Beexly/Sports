def elo_expected_score(rating_a, rating_b, D=400.0):
    """Guarded classic Elo expected score from Maitra et al. arXiv:2512.18013.
    Printed: E_A = 1 / (1 + 10^{(R_B - R_A)/D})
    Fail-closed: returns None on invalid input.
    """
    try:
        ra = float(rating_a)
        rb = float(rating_b)
        d = float(D)
        if d <= 0.0 or not all(abs(x) < 1e9 for x in (ra, rb, d)):
            return None
        return 1.0 / (1.0 + 10.0 ** ((rb - ra) / d))
    except (TypeError, ValueError):
        return None
