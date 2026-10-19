"""SMSCP nonconformity score as printed in Han and Lin, arXiv:2610.19484 eq (1).

R_t = |Y_t - \hat{\mu}_t|.
Missing inputs or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def smscp_nonconformity(y: float | None, mu: float | None) -> float | None:
    if y is None or mu is None:
        return None
    try:
        return abs(float(y) - float(mu))
    except (ValueError, OverflowError, TypeError):
        return None
