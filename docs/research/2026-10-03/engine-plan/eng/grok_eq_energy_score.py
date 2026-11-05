"""Energy score as printed in arXiv:2610.24591.

ES(F_K, y) = (1/K) sum ||f_k - y|| - (1/(2 K^2)) sum sum ||f_k - f_ell||.
Guarded: returns None on invalid input. Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations
from typing import Sequence
import math

def energy_score(ensemble: Sequence[Sequence[float]] | None, observation: Sequence[float] | None) -> float | None:
    if ensemble is None or observation is None:
        return None
    if not isinstance(ensemble, (list, tuple)) or not isinstance(observation, (list, tuple)):
        return None
    K = len(ensemble)
    if K < 1:
        return None
    D = len(observation)
    if D < 1:
        return None
    for member in ensemble:
        if not isinstance(member, (list, tuple)) or len(member) != D:
            return None
        for v in member:
            if not isinstance(v, (int, float)) or v != v:
                return None
    for v in observation:
        if not isinstance(v, (int, float)) or v != v:
            return None
    try:
        sum_dev = 0.0
        for member in ensemble:
            dist = math.sqrt(sum((float(member[i]) - float(observation[i])) ** 2 for i in range(D)))
            sum_dev += dist
        sum_pair = 0.0
        for k in range(K):
            for ell in range(K):
                dist = math.sqrt(sum((float(ensemble[k][i]) - float(ensemble[ell][i])) ** 2 for i in range(D)))
                sum_pair += dist
        es = (sum_dev / K) - (sum_pair / (2 * K * K))
        return es
    except Exception:
        return None
