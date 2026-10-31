"""Fleet aggregation sum as printed in Moradi et al, arXiv:2602.02583 eq (2).

x_{0,t} = sum_{i=1}^N x_{i,t}
Fail-closed on bad inputs. Does not score or write mind.
"""
from __future__ import annotations
from typing import Sequence


def copula_cacp_fleet_sum(site_outputs: Sequence[float] | None) -> float | None:
    if site_outputs is None:
        return None
    try:
        if not isinstance(site_outputs, (list, tuple)):
            return None
        if len(site_outputs) == 0:
            return None
        total = 0.0
        for x in site_outputs:
            if not isinstance(x, (int, float)) or isinstance(x, bool):
                return None
            total += float(x)
        return total
    except (TypeError, ValueError):
        return None
