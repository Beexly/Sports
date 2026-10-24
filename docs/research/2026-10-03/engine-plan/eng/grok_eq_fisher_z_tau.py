"""Fisher-z link from arXiv:2610.23119 printed eq: tau = g(eta) = tanh(eta / 2).

Missing or non-finite input, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def fisher_z_tau(eta: float | None) -> float | None:
    """Printed Fisher-z link: tau = tanh(eta / 2)."""
    if eta is None:
        return None
    try:
        e = float(eta)
        if not math.isfinite(e):
            return None
        tau = math.tanh(e / 2.0)
        if not math.isfinite(tau):
            return None
        return tau
    except (ValueError, OverflowError, TypeError):
        return None
