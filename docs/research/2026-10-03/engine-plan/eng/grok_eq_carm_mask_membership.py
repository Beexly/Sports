"""CARM trust mask membership as printed in arXiv:2611.06151 eq (1).

M_t(tau) = {p in Omega_t : U_t(p) <= tau}.
Returns 1 if u <= tau, 0 if u > tau, None on invalid input.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def carm_mask_membership(u: float | None, tau: float | None) -> int | None:
    if u is None or tau is None:
        return None
    if not isinstance(u, (int, float)) or not isinstance(tau, (int, float)):
        return None
    try:
        u_f = float(u)
        tau_f = float(tau)
    except (TypeError, ValueError):
        return None
    if u_f != u_f or tau_f != tau_f:  # NaN
        return None
    return 1 if u_f <= tau_f else 0
