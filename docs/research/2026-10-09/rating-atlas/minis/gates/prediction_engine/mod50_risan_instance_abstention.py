#!/usr/bin/env python3
"""
Module 50: decision/2107-03090-risan-instance-abstention.ts
arXiv: 2107.03090 — "RISAN: Robust Instance Specific Deep Abstention Network"

Faithful Python port of the TypeScript module's core functions + acceptance gate evaluator.

ACCEPTANCE GATE: ADAPT accepted if the joint (f, rho) learner beats the global gate
by >= 3 points of accepted hit-rate at matched coverage on clean data AND degrades
less under 20% injected noise; else REJECT (keep the fixed-predictor learned score).

Status: wired as eval code. NOT EVALUATED on real walk-forward data yet.
"""
import math
from dataclasses import dataclass
from typing import List


@dataclass
class RisanPick:
    id: str
    margin: float          # signed model confidence y*f(x)
    base_rho: float        # rho(x) head output
    line_disagreement: float  # points the market moved against the model
    won: bool


def double_sigmoid_unit_loss(margin: float, rho: float, d: float, beta: float = 5.0) -> float:
    """Double-sigmoid surrogate adapted to unit loss with per-pick cost d(x)."""
    def s(t: float) -> float:
        return 1.0 / (1.0 + math.exp(-beta * t))
    wrong_term = 2 * (1 - d) * s(-margin - rho)
    abstain_term = d * s(margin + rho) * s(-margin + rho)
    return wrong_term + abstain_term


def market_conditioned_rho(base_rho: float, line_disagreement: float, sensitivity: float = 0.35) -> float:
    """The abstention band widens when the market disagrees with the model."""
    return max(0.0, base_rho + sensitivity * max(line_disagreement, 0.0))


def risan_publish(margin: float, rho: float) -> bool:
    """Publish when the signed margin clears the abstention band."""
    return abs(margin) >= rho


def risan_accepted_hit_rate(picks: List[RisanPick], card_size: int, sensitivity: float = 0.35) -> float:
    """Accepted hit-rate: publish top-k by (margin - rho), most-confident first."""
    ranked = sorted(
        picks,
        key=lambda p: p.margin - market_conditioned_rho(p.base_rho, p.line_disagreement, sensitivity),
        reverse=True,
    )[: max(1, card_size)]
    wins = sum(1 for r in ranked if r.won)
    return wins / len(ranked) if ranked else 0.0


def inject_outcome_noise(picks: List[RisanPick], noise_rate: float) -> List[RisanPick]:
    """Inject label noise at the given rate (deterministic flip of every 1/rate-th pick)."""
    if noise_rate <= 0:
        return [RisanPick(p.id, p.margin, p.base_rho, p.line_disagreement, p.won) for p in picks]
    every = max(1, round(1 / noise_rate))
    out = []
    for i, p in enumerate(picks):
        won = (not p.won) if (i % every == 0) else p.won
        out.append(RisanPick(p.id, p.margin, p.base_rho, p.line_disagreement, won))
    return out


def global_gate_hit_rate(picks: List[RisanPick], card_size: int) -> float:
    """Global-threshold baseline: publish top-k by |margin|."""
    ranked = sorted(picks, key=lambda p: abs(p.margin), reverse=True)[: max(1, card_size)]
    wins = sum(1 for p in ranked if p.won)
    return wins / len(ranked) if ranked else 0.0


def risan_gate_passes(
    risan_clean: float,
    global_clean: float,
    risan_noisy: float,
    global_noisy: float,
) -> bool:
    """Gate: RISAN beats global by >=3pt clean AND degrades no worse under noise."""
    clean_win = risan_clean - global_clean >= 0.03
    risan_degradation = risan_clean - risan_noisy
    global_degradation = global_clean - global_noisy
    return clean_win and risan_degradation <= global_degradation + 1e-9


def evaluate_gate(
    picks: List[RisanPick],
    card_size: int,
    noise_rate: float = 0.20,
) -> dict:
    """Run the acceptance gate on a pick set. REFUSE if pick set is empty."""
    if not picks:
        return {"verdict": "REFUSE", "reason": "empty pick set"}
    noisy = inject_outcome_noise(picks, noise_rate)
    risan_clean = risan_accepted_hit_rate(picks, card_size)
    global_clean = global_gate_hit_rate(picks, card_size)
    risan_noisy = risan_accepted_hit_rate(noisy, card_size)
    global_noisy = global_gate_hit_rate(noisy, card_size)
    passes = risan_gate_passes(risan_clean, global_clean, risan_noisy, global_noisy)
    return {
        "module": "2107-03090-risan-instance-abstention",
        "verdict": "PASS" if passes else "FAIL",
        "risan_clean": round(risan_clean, 4),
        "global_clean": round(global_clean, 4),
        "clean_margin": round(risan_clean - global_clean, 4),
        "clean_margin_required": 0.03,
        "risan_degradation": round(risan_clean - risan_noisy, 4),
        "global_degradation": round(global_clean - global_noisy, 4),
        "noise_rate": noise_rate,
        "n_picks": len(picks),
        "card_size": card_size,
    }


if __name__ == "__main__":
    import random
    random.seed(50)
    picks = [
        RisanPick(f"p{i}", random.gauss(0.3, 1.0), random.uniform(0.1, 0.5),
                  random.uniform(0, 2), random.random() < 0.55)
        for i in range(500)
    ]
    print(evaluate_gate(picks, card_size=50))
