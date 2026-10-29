def empirical_copula_cpts(u_query, u_cal):
    """Guarded empirical copula from Sun & Yu arXiv:2212.03281 eq (7).
    C_empirical(u) = 1/(|D|+1) * sum_i prod_j 1_{u_j^i < u_j}
    including the infinity point. Fail-closed on bad inputs.
    """
    import math
    try:
        if not isinstance(u_query, (list, tuple)) or not isinstance(u_cal, (list, tuple)):
            return None
        k = len(u_query)
        if k == 0:
            return None
        for uj in u_query:
            uj = float(uj)
            if not math.isfinite(uj) or not (0.0 <= uj <= 1.0):
                return None
        n = len(u_cal)
        count = 0  # infinity contributes 0 to the sum
        # According to the formula: prod 1_{u_j^i < u_j}, for i=inf, u_j^i=inf, inf < u_j is False for finite u_j, so prod=0, so the +1 is for the denom only?
        # Looking back: sum over i in cal-2 union {inf} of prod 1_{u^i_j < u_j}
        # For infinity, prod is 0 if any u_j < inf always, wait no: 1_{inf < u_j} is 0 for u_j <=1.
        # So the infinity contributes 0 to the sum. Why +1 in denom and union?
        # From the text: to make it a rank statistic properly.
        # Let's implement as written: include the inf point which contributes 0.
        for ui in u_cal:
            if not isinstance(ui, (list, tuple)) or len(ui) != k:
                return None
            prod = 1.0
            for j in range(k):
                uij = float(ui[j])
                if not math.isfinite(uij) or not (0.0 <= uij <= 1.0):
                    return None
                if not (uij < u_query[j]):
                    prod = 0.0
                    break
            count += prod
        return count / (n + 1)
    except (TypeError, ValueError, OverflowError):
        return None
