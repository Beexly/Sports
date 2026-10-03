"""Unwired identities. No score. No mint. Never main.

ECE = sum_m (n_m / n) |acc(B_m) - conf(B_m)|
Source: Guo et al., arXiv 1706.04599.

y = F(x) + x
Source: He et al., arXiv 1512.03385, equation 1.

xhat = (x - mu) / sqrt(var + eps)
Source: Ioffe and Szegedy, arXiv 1502.03167.

y_k^LS = y_k * (1 - alpha) + alpha / K
Source: Szegedy et al., label smoothing, as used by Muller et al., arXiv 1905.13208.
"""
from __future__ import annotations

import math


def _finite(x):
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v):
        return None
    return v


def expected_calibration_error(confidences, correct, n_bins):
    if not isinstance(confidences, (list, tuple)) or not isinstance(correct, (list, tuple)):
        return None
    if len(confidences) == 0 or len(confidences) != len(correct):
        return None
    try:
        bins = int(n_bins)
    except (TypeError, ValueError):
        return None
    if bins < 1:
        return None
    counts = [0] * bins
    acc = [0.0] * bins
    conf = [0.0] * bins
    for c, y in zip(confidences, correct):
        cf = _finite(c)
        if cf is None or not (0.0 <= cf <= 1.0):
            return None
        if y not in (0, 1, True, False):
            return None
        b = min(bins - 1, int(cf * bins))
        counts[b] += 1
        acc[b] += 1.0 if y else 0.0
        conf[b] += cf
    n = float(len(confidences))
    ece = 0.0
    for i in range(bins):
        if counts[i] == 0:
            continue
        ece += (counts[i] / n) * abs(acc[i] / counts[i] - conf[i] / counts[i])
    return ece


def residual_add(fx, x):
    a = _finite(fx)
    b = _finite(x)
    if a is None or b is None:
        return None
    return a + b


def batch_norm_transform(x, mu, var, eps):
    vals = [_finite(v) for v in (x, mu, var, eps)]
    if any(v is None for v in vals):
        return None
    x_f, mu_f, var_f, eps_f = vals
    if var_f < 0.0 or eps_f <= 0.0:
        return None
    return (x_f - mu_f) / math.sqrt(var_f + eps_f)


def label_smooth(y, alpha, k):
    y_f = _finite(y)
    a = _finite(alpha)
    try:
        classes = int(k)
    except (TypeError, ValueError):
        return None
    if y_f is None or a is None or classes < 2:
        return None
    if y_f not in (0.0, 1.0) or not (0.0 <= a < 1.0):
        return None
    return y_f * (1.0 - a) + a / classes


FUNCTIONS = {
    "expected_calibration_error": expected_calibration_error,
    "residual_add": residual_add,
    "batch_norm_transform": batch_norm_transform,
    "label_smooth": label_smooth,
}
