"""Guarded CELR expected local radius from Qiu et al. arXiv:2610.31336 eq for R_beta(omega).

R_beta(omega) := (1/beta) * integral_0^beta Q(omega, tau) d tau.

Approximated as the mean of provided evenly spaced quantile samples over [0, beta].
Fail-closed on invalid beta, empty or non-finite samples.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def celr_expected_local_radius(beta: float | None, quantile_samples: list | None) -> float | None:
    if beta is None or quantile_samples is None:
        return None
    try:
        b = float(beta)
        if not (0.0 < b <= 1.0):
            return None
        if not isinstance(quantile_samples, (list, tuple)) or len(quantile_samples) == 0:
            return None
        samples = [float(q) for q in quantile_samples]
        if not all(math.isfinite(s) and s >= 0.0 for s in samples):
            return None
        # discrete approximation of the integral average
        return sum(samples) / len(samples)
    except (TypeError, ValueError, OverflowError):
        return None
