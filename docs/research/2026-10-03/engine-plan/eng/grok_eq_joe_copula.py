"""Joe copula CDF as printed in Eguchi and Kato, arXiv:2502.16831 §2.1.

C_theta(u) = 1 - [sum (1-u_k)^theta - prod (1-u_i)^theta ]^{1/theta} for theta >= 1.
Bivariate form: 1 - [(1-u)^theta + (1-v)^theta - (1-u)^theta*(1-v)^theta]^{1/theta}.
Missing inputs, u outside (0, 1], theta < 1, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def joe_copula(u1: float | None, u2: float | None, theta: float | None) -> float | None:
    if u1 is None or u2 is None or theta is None:
        return None
    u = float(u1)
    v = float(u2)
    th = float(theta)
    if not (0.0 < u <= 1.0 and 0.0 < v <= 1.0):
        return None
    if th < 1.0:
        return None
    try:
        term = (1.0 - u) ** th + (1.0 - v) ** th - ((1.0 - u) ** th) * ((1.0 - v) ** th)
        if term < 0.0:
            return None
        return 1.0 - term ** (1.0 / th)
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
