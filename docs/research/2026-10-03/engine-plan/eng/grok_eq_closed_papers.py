"""Closed paper identities. No score. No mint. Never main.

y = F + x, or y = F + W_s x when dimensions differ.
He et al., arXiv 1512.03385, eq. 1 and eq. 2.

y = gamma * (x - mu) / sqrt(var + eps) + beta
Ioffe and Szegedy, arXiv 1502.03167, Algorithm 1.

q_i = exp(z_i / T) / sum_j exp(z_j / T)
Hinton, Vinyals, Dean, arXiv 1503.02531, eq. 1.

L = mean((eps - eps_hat)^2)
Ho, Jain, Abbeel, arXiv 2006.11239, eq. 14, the simple loss only. Not a sampler.
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


def residual_block(f, x, w_s=None):
    ff = _finite(f)
    xx = _finite(x)
    if ff is None or xx is None:
        return None
    if w_s is None:
        return ff + xx
    ws = _finite(w_s)
    if ws is None:
        return None
    return ff + ws * xx


def batch_norm(x, mu, var, eps, gamma, beta):
    vals = [_finite(v) for v in (x, mu, var, eps, gamma, beta)]
    if any(v is None for v in vals):
        return None
    x_f, mu_f, var_f, eps_f, g, b = vals
    if var_f < 0.0 or eps_f <= 0.0:
        return None
    return g * (x_f - mu_f) / math.sqrt(var_f + eps_f) + b


def temperature_softmax(logits, temperature):
    t = _finite(temperature)
    if t is None or t <= 0.0 or not isinstance(logits, (list, tuple)) or len(logits) < 2:
        return None
    vals = [_finite(z) for z in logits]
    if any(v is None for v in vals):
        return None
    scaled = [v / t for v in vals]
    m = max(scaled)
    exps = [math.exp(v - m) for v in scaled]
    s = sum(exps)
    if s <= 0.0 or not math.isfinite(s):
        return None
    return [e / s for e in exps]


def distill_logit_grad(q, p, temperature):
    qq = _finite(q)
    pp = _finite(p)
    t = _finite(temperature)
    if qq is None or pp is None or t is None or t <= 0.0:
        return None
    if not (0.0 <= qq <= 1.0 and 0.0 <= pp <= 1.0):
        return None
    return (qq - pp) / t


def simple_noise_loss(eps, eps_hat):
    if not isinstance(eps, (list, tuple)) or not isinstance(eps_hat, (list, tuple)):
        return None
    if len(eps) == 0 or len(eps) != len(eps_hat):
        return None
    acc = 0.0
    for a, b in zip(eps, eps_hat):
        aa = _finite(a)
        bb = _finite(b)
        if aa is None or bb is None:
            return None
        acc += (aa - bb) ** 2
    return acc / len(eps)


FUNCTIONS = {
    "residual_block": residual_block,
    "batch_norm": batch_norm,
    "temperature_softmax": temperature_softmax,
    "distill_logit_grad": distill_logit_grad,
    "simple_noise_loss": simple_noise_loss,
}
