"""Fleet aggregation sum as printed in Moradi et al., arXiv:2602.02583 eq (2).

x_0,t = sum_{i=1}^N x_i,t
Missing inputs, non-numeric, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def fleet_aggregation_sum(site_outputs: list[float] | None) -> float | None:
    if site_outputs is None:
        return None
    if not isinstance(site_outputs, list) or len(site_outputs) == 0:
        return None
    try:
        total = 0.0
        for x in site_outputs:
            if x is None:
                return None
            xf = float(x)
            if not (xf == xf):  # NaN
                return None
            total += xf
        return total
    except (TypeError, ValueError, OverflowError):
        return None
