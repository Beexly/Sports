"""Guarded HAC node height recursion from Marconi arXiv:2610.10134 eq (1).

h_v(x) := h_par(v)(x) - η_v

Missing, non-numeric, or math failure fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def hac_node_height(h_parent: float | None, eta: float | None) -> float | None:
    if h_parent is None or eta is None:
        return None
    try:
        return float(h_parent) - float(eta)
    except (ValueError, OverflowError, TypeError):
        return None
