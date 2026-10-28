"""Guarded AFT log peak age from Peng et al arXiv:2610.35473 printed eq (3).

log(τ_i) = β_0 + β^T x_i + e_i , but the mean is β_0 + β · x

Fail-closed on invalid inputs: missing, non-finite, mismatched lengths, empty covariates if beta given.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def aft_log_peak_age(beta0: float | None, beta: list | None, x: list | None) -> float | None:
    if beta0 is None or beta is None or x is None:
        return None
    try:
        b0 = float(beta0)
        if not math.isfinite(b0):
            return None
        if not isinstance(beta, (list, tuple)) or not isinstance(x, (list, tuple)):
            return None
        if len(beta) != len(x):
            return None
        if len(beta) == 0:
            return b0
        dot = 0.0
        for bi, xi in zip(beta, x):
            bi_f = float(bi)
            xi_f = float(xi)
            if not math.isfinite(bi_f) or not math.isfinite(xi_f):
                return None
            dot += bi_f * xi_f
        return b0 + dot
    except (TypeError, ValueError, OverflowError):
        return None
