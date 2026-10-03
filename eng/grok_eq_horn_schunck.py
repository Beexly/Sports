"""Brightness constancy residual. No free coefficients. No score. No mint. Never main.

E_x u + E_y v + E_t = 0
Source: Horn and Schunck, Determining Optical Flow, Artificial Intelligence 17 (1981),
https://people.csail.mit.edu/bkph/papers/Optical_Flow_OPT.pdf printed p. 187.
This is the constraint, not the iterative flow solver. u and v are supplied.
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


def brightness_constancy_residual(ex, ey, et, u, v):
    vals = [_finite(x) for x in (ex, ey, et, u, v)]
    if any(x is None for x in vals):
        return None
    ex_f, ey_f, et_f, u_f, v_f = vals
    return ex_f * u_f + ey_f * v_f + et_f


FUNCTIONS = {"brightness_constancy_residual": brightness_constancy_residual}
