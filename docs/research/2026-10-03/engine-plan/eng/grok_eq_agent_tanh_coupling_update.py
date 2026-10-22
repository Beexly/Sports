"""Guarded agent belief update from Dey & Marchetti arXiv:2610.28285 eq (1).

x_i^+ = x_i + h * sum_j a_ij^m * tanh(x_j - x_i)

Missing, non-numeric, bad shapes, or invalid fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math
from typing import Sequence


def agent_tanh_coupling_update(
    beliefs: Sequence[float] | None,
    adjacency_row: Sequence[float] | None,
    step_size: float | None,
    agent_index: int | None,
) -> float | None:
    if beliefs is None or adjacency_row is None or step_size is None or agent_index is None:
        return None
    try:
        x = [float(v) for v in beliefs]
        a = [float(v) for v in adjacency_row]
        h = float(step_size)
        i = int(agent_index)
        n = len(x)
        if n == 0 or len(a) != n or i < 0 or i >= n or h < 0:
            return None
        if any(not math.isfinite(v) for v in x + a + [h]):
            return None
        delta = sum(a[j] * math.tanh(x[j] - x[i]) for j in range(n))
        return x[i] + h * delta
    except (TypeError, ValueError, OverflowError):
        return None
