"""Guarded kinship-scaled pairwise correlation from Seboka et al. arXiv:2610.27388.

Off-diagonal entry of the Gaussian copula correlation matrix:
v_{jk} = h_{l_j, l_k} * phi_{jk}
where h in [0,1] is the heritability parameter for the event-type pair,
and phi in [0,1] is the kinship coefficient.

Fail-closed on invalid inputs. Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def kinship_scaled_corr(h: float | None, phi: float | None) -> float | None:
    if h is None or phi is None:
        return None
    try:
        hh = float(h)
        pp = float(phi)
        if not (0.0 <= hh <= 1.0) or not (0.0 <= pp <= 1.0):
            return None
        return hh * pp
    except (TypeError, ValueError, OverflowError):
        return None
