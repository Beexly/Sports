def elo_expected_score(rating_a: float, rating_b: float, scale: float = 400.0) -> float:
    """Guarded Elo expected score for A. Fail-closed on invalid inputs.
    Printed from arXiv:2512.18013v1: E_A = 1 / (1 + 10**((R_B - R_A)/400))
    """
    if not isinstance(rating_a, (int, float)) or not isinstance(rating_b, (int, float)):
        raise TypeError("ratings must be numeric")
    if scale <= 0:
        raise ValueError("scale must be positive")
    if rating_a < 0 or rating_b < 0:
        raise ValueError("ratings must be non-negative")
    diff = (rating_b - rating_a) / scale
    return 1.0 / (1.0 + 10.0 ** diff)
