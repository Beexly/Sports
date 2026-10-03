"""LSTM memory-cell update as printed. No score. No mint. Never main.

s(0) = 0
s(t) = s(t-1) + y_in(t) * g(net(t)) for t > 0
y(t) = y_out(t) * h(s(t))
Source: Hochreiter and Schmidhuber, Long Short-Term Memory, Neural Computation 1997,
https://www.bioinf.jku.at/publications/older/2604.pdf printed p. 7 of that open reprint.
g and h are supplied callables. This does not train weights and does not emit a pick.
"""
from __future__ import annotations

import math
from typing import Any, Callable


def _finite(x: Any) -> float | None:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v):
        return None
    return v


def lstm_cell_step(s_prev: Any, y_in: Any, net: Any, y_out: Any, g: Callable[[float], float], h: Callable[[float], float]) -> tuple[float, float] | None:
    vals = [_finite(x) for x in (s_prev, y_in, net, y_out)]
    if any(x is None for x in vals):
        return None
    s_prev_f, y_in_f, net_f, y_out_f = vals
    try:
        gated = float(g(net_f))
        s_t = s_prev_f + y_in_f * gated
        y_t = y_out_f * float(h(s_t))
    except (TypeError, ValueError):
        return None
    if not math.isfinite(s_t) or not math.isfinite(y_t):
        return None
    return s_t, y_t


FUNCTIONS = {"lstm_cell_step": lstm_cell_step}
