def sgcp_nonconformity(pred_prob_true_class):
    """Guarded SGCP nonconformity score s(x,y)=1-f_theta^y(x) from Zhong et al arXiv:2610.11957.
    Printed: s(x,y)=1-f_theta^y(x)
    Fail-closed: returns None on invalid input.
    """
    try:
        p = float(pred_prob_true_class)
        if not (0.0 <= p <= 1.0):
            return None
        return 1.0 - p
    except (TypeError, ValueError):
        return None
