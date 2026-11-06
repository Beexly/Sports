"""
Proposal ranker bake-off:
  R1 energy:        rank edges by ||x_t - x_s||^2
  R2 one-step ΔE:   rank by energy drop if edge dropped
  R3 Δc_S proxy:    rank by contribution to cycle obstruction

Report recovery@k on planted suites.
"""

from __future__ import annotations

from typing import Any
import numpy as np


def rank_by_energy(gaps: dict[str, float]) -> list[tuple[str, float]]:
    return sorted(gaps.items(), key=lambda kv: -kv[1])


def rank_by_delta_e(
    nodes: list[str],
    edges: list[tuple[str, str]],
    energy_fn,
) -> list[tuple[str, float]]:
    """One-step ΔE if edge removed (higher = more useful to drop)."""
    base = energy_fn(edges)
    scores = []
    for i, e in enumerate(edges):
        remaining = edges[:i] + edges[i + 1 :]
        scores.append((f"{e[0]}->{e[1]}", base - energy_fn(remaining)))
    return sorted(scores, key=lambda kv: -kv[1])


def recovery_at_k(
    ranked: list[tuple[str, float]],
    true_bad: set[str],
    k: int,
) -> float:
    top = {e for e, _ in ranked[:k]}
    if not true_bad:
        return 1.0
    return len(top & true_bad) / len(true_bad)


def bakeoff_report(
    gaps: dict[str, float],
    true_bad: set[str],
    ks: tuple[int, ...] = (1, 3, 5),
) -> dict[str, Any]:
    ranked = rank_by_energy(gaps)
    return {
        "ranker": "energy",
        "recovery": {f"@{k}": recovery_at_k(ranked, true_bad, k) for k in ks},
        "ranked": ranked[:10],
    }
