"""Kalman 1960, Duke scan of ASME J. Basic Eng. 82:35-45.

Text-layer quote, equations (28)-(30):
delta*(t) = Phi(t+1;t) P*(t) M'(t) [M(t) P*(t) M'(t)]^{-1}
Phi*(t+1;t) = Phi(t+1;t) - delta*(t) M(t)
P*(t+1) = Phi*(t+1;t) P*(t) Phi*'(t+1;t) + Q(t)

Scalar path only. None on a singular innovation. Does not write mind.jsonl.
"""
import math


def _f(x):
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v):
        return None
    return v


def kalman_update(phi, p, m, q):
    phi, p, m, q = _f(phi), _f(p), _f(m), _f(q)
    if None in (phi, p, m, q) or p < 0 or q < 0:
        return None
    innov = m * p * m
    if innov == 0:
        return None
    delta = phi * p * m / innov
    phi_star = phi - delta * m
    p_next = phi_star * p * phi_star + q
    return {"delta": delta, "phi_star": phi_star, "p_next": p_next}


def source():
    return {
        "paper": "Kalman 1960",
        "url": "https://courses.cs.duke.edu/compsci527/cps274/fall11/papers/Kalman60.pdf",
        "equation_numbers": "28-30",
        "body": "TEXT_LAYER_QUOTE",
    }
