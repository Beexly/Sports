"""Guarded VCPI reference scale from Cho and Matteson arXiv:2610.31621 eq (1).

sigma_hat = argmin_sigma sum_k [Q_k - f - sigma * z_k]^2
Closed form: sum((Q_k - f) * z_k) / sum(z_k**2)

Missing, non-numeric, length mismatch, zero denominator, or invalid fail closed to None.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations
from typing import Sequence


def vcpi_reference_scale(
    quantiles: Sequence[float] | None,
    forecast: float | None,
    z_scores: Sequence[float] | None,
) -> float | None:
    if quantiles is None or forecast is None or z_scores is None:
        return None
    try:
        qs = [float(q) for q in quantiles]
        zs = [float(z) for z in z_scores]
        f = float(forecast)
        if len(qs) != len(zs) or len(qs) == 0:
            return None
        num = 0.0
        den = 0.0
        for q, z in zip(qs, zs):
            num += (q - f) * z
            den += z * z
        if den == 0.0:
            return None
        return float(num / den)
    except (TypeError, ValueError, OverflowError):
        return None
