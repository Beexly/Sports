"""Guarded sample continuous ranked probability score (CRPS) from Lakatos arXiv:2610.24591 printed sample CRPS.

CRPS(f, y) = (1/K) * sum_k |f_k - y| - (1/(2 K^2)) * sum_k sum_l |f_k - f_l|

Fail-closed on invalid inputs: missing, non-finite, empty ensemble.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations

import math


def crps_sample(ensemble: list | None, observation: float | None) -> float | None:
    if ensemble is None or observation is None:
        return None
    try:
        if not isinstance(ensemble, (list, tuple)) or len(ensemble) == 0:
            return None
        y = float(observation)
        if not math.isfinite(y):
            return None
        members = []
        for v in ensemble:
            vf = float(v)
            if not math.isfinite(vf):
                return None
            members.append(vf)
        k = len(members)
        if k == 0:
            return None
        sum_abs_diff_obs = sum(abs(m - y) for m in members)
        sum_abs_diff_pairs = sum(abs(members[i] - members[j]) for i in range(k) for j in range(k))
        return (sum_abs_diff_obs / k) - (sum_abs_diff_pairs / (2.0 * k * k))
    except (TypeError, ValueError, OverflowError):
        return None
