import math

def ddr_conformal_volume(qhat, t, det_w):
    """Guarded DDR conformal prediction set volume from Tran et al. 2026 arXiv:2611.06320 eq after (3).
    Vol(Q(X0)) = (sqrt(pi) * qhat)^t / (Gamma(t/2 + 1) * sqrt(det W))
    Fail-closed on non-finite, non-positive det_w, non-positive integer t, or non-positive qhat.
    """
    try:
        q = float(qhat)
        tt = int(t)
        dw = float(det_w)
        if not (math.isfinite(q) and q > 0):
            return None
        if not (math.isfinite(dw) and dw > 0):
            return None
        if tt <= 0:
            return None
        num = (math.sqrt(math.pi) * q) ** tt
        gamma_arg = tt / 2.0 + 1.0
        gamma_val = math.gamma(gamma_arg)
        if not math.isfinite(gamma_val) or gamma_val <= 0:
            return None
        denom = gamma_val * math.sqrt(dw)
        if not math.isfinite(denom) or denom <= 0:
            return None
        vol = num / denom
        if not math.isfinite(vol) or vol < 0:
            return None
        return vol
    except (TypeError, ValueError, OverflowError):
        return None
