def first_acceptable_rank(verdicts):
    """Guarded first acceptable rank from Yu et al arXiv:2610.10829 eq (1).
    kappa = min { j : z_j = 1 }, min empty := +inf
    Fail-closed: returns None on invalid input; +inf as None for empty.
    """
    try:
        if not isinstance(verdicts, (list, tuple)):
            return None
        for j, z in enumerate(verdicts, start=1):
            if z not in (0, 1, True, False):
                return None
            if z == 1 or z is True:
                return j
        return None  # +inf case, fail-closed as None
    except (TypeError, ValueError):
        return None
