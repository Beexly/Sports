def nnm_score(s_unlab_pseudo, s_lab_true, s_lab_pseudo):
    """Guarded NNM unlabeled nonconformity score from arXiv 2505.21147 eq (3).
    S_nnm = S(x_tilde, y_hat) + S(x_j, y_j) - S(x_j, y_hat_j)
    Fail-closed on non-finite, non-numeric inputs.
    """
    import math
    try:
        su = float(s_unlab_pseudo)
        st = float(s_lab_true)
        sp = float(s_lab_pseudo)
        if not (math.isfinite(su) and math.isfinite(st) and math.isfinite(sp)):
            return None
        return su + st - sp
    except (TypeError, ValueError, OverflowError):
        return None
