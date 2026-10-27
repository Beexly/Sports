def censoring_compatible_min(x, psi_list):
    """Guarded min reduction from Bladt arXiv:2610.24911 printed eq (4) / Def 1 / Thm 1 (ii).
    s(x) = min_j psi_j(x^{(j)}). Returns the min or None on non-numeric/non-finite/mismatched.
    Fail-closed. Censoring-compatible by construction when psi nondecreasing.
    """
    import math
    try:
        if not isinstance(x, (list, tuple)) or not isinstance(psi_list, (list, tuple)):
            return None
        if len(x) != len(psi_list) or len(x) == 0:
            return None
        vals = []
        for xi, psi in zip(x, psi_list):
            # psi assumed callable; evaluate
            try:
                v = float(psi(float(xi)))
            except Exception:
                return None
            if not math.isfinite(v):
                return None
            vals.append(v)
        return min(vals)
    except (TypeError, ValueError, OverflowError, AttributeError):
        return None
