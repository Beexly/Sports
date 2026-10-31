import math

def margin_distance_score(pi_y, pi_z):
    """Guarded margin distance nonconformity score from Boman arXiv:2605.24983 eq (14).
    s = pi_z - pi_y. Fail-closed: returns None on invalid input.
    """
    try:
        y = float(pi_y)
        z = float(pi_z)
        if not (math.isfinite(y) and math.isfinite(z)):
            return None
        if y < 0 or z < 0 or y > 1 or z > 1:
            return None
        return z - y
    except (TypeError, ValueError):
        return None
