#!/usr/bin/env python3
"""
Module 51: decision/2109-10814v1-variance-budgeted-kelly.ts
arXiv: 2109.10814v1 — "Fractional Growth Portfolio Investment"

Faithful Python port of the TypeScript module's core functions + acceptance gate evaluator.

ACCEPTANCE GATE: Replicated fractional-Kelly portfolio must satisfy:
  annualized SD in [0.16, 0.19], max drawdown in [38%, 46%],
  final wealth within 10% of $576,464 — i.e., reproduce the paper's risk profile,
  not just its return; then the variance-budgeted alpha must beat fixed alpha
  on realized growth/risk.

Status: wired as eval code. NOT EVALUATED on real walk-forward data yet.
"""
import math
import random
from dataclasses import dataclass
from typing import List


@dataclass
class SlateEdge:
    id: str
    f_full: float   # full-Kelly fraction for this pick
    p: float        # win probability
    odds: float     # decimal odds


def _mulberry32(seed: int):
    a = seed & 0xFFFFFFFF
    def rand():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = (a ^ (a >> 15)) * (1 | a) & 0xFFFFFFFF
        t = (t + ((t ^ (t >> 7)) * (61 | t) & 0xFFFFFFFF)) & 0xFFFFFFFF
        t ^= t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return rand


def estimate_slate_variance(slate: List[SlateEdge], n_sims: int, seed: int = 555) -> float:
    """Estimate V(1): slate log-growth variance under full-Kelly fractions."""
    if not slate or n_sims <= 0:
        return 0.0
    rand = _mulberry32(seed)
    mean = 0.0
    m2 = 0.0
    for _ in range(n_sims):
        r = 0.0
        for pick in slate:
            win = rand() < pick.p
            r += pick.f_full * (pick.odds - 1 if win else -1)
        g = math.log(max(1 + r, 1e-12))
        mean += g
        m2 += g * g
    mean /= n_sims
    return max(m2 / n_sims - mean * mean, 0.0)


def variance_budgeted_alpha(v_target: float, v_full: float) -> float:
    """alpha = sqrt(V_target / V(1)), clipped to [0, 1]."""
    if v_full <= 0 or v_target <= 0:
        return 0.0
    return min(math.sqrt(v_target / v_full), 1.0)


def variance_budgeted_stakes(slate: List[SlateEdge], v_target: float,
                             n_sims: int = 4000, seed: int = 555) -> dict:
    v_full = estimate_slate_variance(slate, n_sims, seed)
    alpha = variance_budgeted_alpha(v_target, v_full)
    return {
        "stakes": [{"id": p.id, "stake": alpha * p.f_full} for p in slate],
        "alpha": alpha,
        "v_full": v_full,
    }


def fixed_alpha_stakes(slate: List[SlateEdge], alpha: float = 0.25) -> List[dict]:
    return [{"id": p.id, "stake": alpha * p.f_full} for p in slate]


def growth_risk_ratio(log_growths: List[float]) -> float:
    """Realized log-growth per unit of realized variance."""
    n = len(log_growths)
    if n == 0:
        return 0.0
    mean = sum(log_growths) / n
    var = sum((g - mean) ** 2 for g in log_growths) / n
    return mean / var if var > 0 else 0.0


def variance_budgeted_gate_passes(
    annualized_sd: float,
    max_dd: float,
    final_wealth: float,
    budgeted_ratio: float,
    fixed_ratio: float,
) -> bool:
    profile_ok = (
        0.16 <= annualized_sd <= 0.19
        and 0.38 <= max_dd <= 0.46
        and abs(final_wealth - 576464) / 576464 <= 0.10
    )
    return profile_ok and budgeted_ratio > fixed_ratio


def evaluate_gate(
    annualized_sd: float,
    max_dd: float,
    final_wealth: float,
    budgeted_ratio: float,
    fixed_ratio: float,
) -> dict:
    """Run the acceptance gate on replication metrics. REFUSE if inputs missing."""
    inputs = [annualized_sd, max_dd, final_wealth, budgeted_ratio, fixed_ratio]
    if any(v is None for v in inputs):
        return {"verdict": "REFUSE", "reason": "missing replication metrics"}
    passes = variance_budgeted_gate_passes(
        annualized_sd, max_dd, final_wealth, budgeted_ratio, fixed_ratio)
    return {
        "module": "2109-10814v1-variance-budgeted-kelly",
        "verdict": "PASS" if passes else "FAIL",
        "annualized_sd": annualized_sd,
        "sd_band": [0.16, 0.19],
        "max_dd": max_dd,
        "dd_band": [0.38, 0.46],
        "final_wealth": final_wealth,
        "wealth_target": 576464,
        "wealth_within_10pct": abs(final_wealth - 576464) / 576464 <= 0.10,
        "budgeted_ratio": round(budgeted_ratio, 4),
        "fixed_ratio": round(fixed_ratio, 4),
        "budgeted_beats_fixed": budgeted_ratio > fixed_ratio,
    }


if __name__ == "__main__":
    # Smoke test: paper replication values (NOT a real evaluation)
    print(evaluate_gate(0.175, 0.42, 590000, 0.85, 0.72))
    # Smoke test of the variance machinery on a synthetic slate
    slate = [SlateEdge(f"s{i}", 0.02, 0.55, 2.0) for i in range(20)]
    print(variance_budgeted_stakes(slate, v_target=0.001, n_sims=500))
