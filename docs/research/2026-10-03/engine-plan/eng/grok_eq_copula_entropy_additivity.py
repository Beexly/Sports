"""Copula entropy additivity as printed in Lu, arXiv:2609.20512.

H(gamma(Phi; Psi_1, ..., Psi_n)) = H(Phi) + sum H(Psi_k).
Missing inputs or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

from typing import Sequence


def copula_entropy_additivity(h_phi: float | None, h_psis: Sequence[float] | None) -> float | None:
    if h_phi is None or h_psis is None:
        return None
    try:
        total = float(h_phi)
        for h in h_psis:
            total += float(h)
        return total
    except (ValueError, OverflowError, TypeError):
        return None
