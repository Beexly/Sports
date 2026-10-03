"""Adam moment update as printed. No score. No mint. Never main.

m_t = beta1 * m_{t-1} + (1 - beta1) * g_t
v_t = beta2 * v_{t-1} + (1 - beta2) * g_t^2
theta_t = theta_{t-1} - alpha * mhat_t / (sqrt(vhat_t) + eps)
Source: Kingma and Ba, Adam, https://arxiv.org/pdf/1412.6980 printed p. 2, Algorithm 1.
Bias-corrected moments are supplied by the caller. This function does not invent beta defaults.
"""
from __future__ import annotations

import math
from typing import Any


def _finite(x: Any) -> float | None:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v):
        return None
    return v


def adam_moments(m_prev: Any, v_prev: Any, g: Any, beta1: Any, beta2: Any) -> tuple[float, float] | None:
    vals = [_finite(x) for x in (m_prev, v_prev, g, beta1, beta2)]
    if any(x is None for x in vals):
        return None
    m_prev_f, v_prev_f, g_f, b1, b2 = vals
    if not (0.0 <= b1 < 1.0 and 0.0 <= b2 < 1.0):
        return None
    m_t = b1 * m_prev_f + (1.0 - b1) * g_f
    v_t = b2 * v_prev_f + (1.0 - b2) * (g_f * g_f)
    return m_t, v_t


def adam_step(theta_prev: Any, alpha: Any, mhat: Any, vhat: Any, eps: Any) -> float | None:
    vals = [_finite(x) for x in (theta_prev, alpha, mhat, vhat, eps)]
    if any(x is None for x in vals):
        return None
    theta_f, alpha_f, mhat_f, vhat_f, eps_f = vals
    if alpha_f <= 0.0 or eps_f <= 0.0 or vhat_f < 0.0:
        return None
    return theta_f - alpha_f * mhat_f / (math.sqrt(vhat_f) + eps_f)


FUNCTIONS = {"adam_moments": adam_moments, "adam_step": adam_step}
