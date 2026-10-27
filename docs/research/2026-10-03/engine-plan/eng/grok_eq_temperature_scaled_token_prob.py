def temperature_scaled_token_prob(logit, temperature, logits_sum_exp):
    """Guarded temperature-scaled token probability from Doula & Mühlhäuser arXiv:2610.28937 printed eq.
    p = exp(logit / t) / sum_exp .
    Fail-closed on non-finite, non-positive temperature, or non-numeric inputs.
    """
    import math
    try:
        ell = float(logit)
        t = float(temperature)
        s = float(logits_sum_exp)
        if not (math.isfinite(ell) and math.isfinite(t) and math.isfinite(s)):
            return None
        if t <= 0 or s <= 0:
            return None
        return math.exp(ell / t) / s
    except (TypeError, ValueError, OverflowError):
        return None
