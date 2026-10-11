#!/usr/bin/env python3
"""
Module 62: decision/2508-07556v2-instability-gate.ts
arXiv: 2508.07556 — per-pick prediction instability as a selection signal

Faithful Python port of the TypeScript module's core functions + acceptance gate evaluator.

GATE: Tests whether per-pick prediction instability (checkpoint or 10-seed bagging
disagreement) is a better selection signal than confidence at fixed coverage.
Pass = "ADOPT if at c=0.70 on 2024-2025 engine picks, instability-selected picks beat
confidence-top-70% selection by >=1.0pp hit rate (or +1.0pp cover rate for spreads),
two-sided McNemar p<0.10."
Fail = under 1.0pp, or not significant at p<0.10.

Status: wired as eval code. NOT EVALUATED on real walk-forward data yet.
"""
from dataclasses import dataclass
from typing import List
import math


@dataclass
class EnginePick:
    id: str
    confidence: float       # engine's stated confidence (win prob)
    seed_probs: List[float] # 10-seed bagging probabilities (or checkpoint probs)
    won: bool               # did the pick win (hit) / cover


def instability(pick: EnginePick) -> float:
    """Per-pick prediction instability: std-dev across seeds/checkpoints."""
    s = pick.seed_probs
    if len(s) < 2:
        return 0.0
    mean = sum(s) / len(s)
    var = sum((x - mean) ** 2 for x in s) / (len(s) - 1)
    return math.sqrt(var)


def select_top_confidence(picks: List[EnginePick], coverage: float) -> List[int]:
    """Indices of the top-`coverage` fraction by confidence."""
    n = len(picks)
    k = max(1, int(round(n * coverage)))
    order = sorted(range(n), key=lambda i: picks[i].confidence, reverse=True)
    return order[:k]


def select_low_instability(picks: List[EnginePick], coverage: float) -> List[int]:
    """Indices of the lowest-instability `coverage` fraction (stable = selected)."""
    n = len(picks)
    k = max(1, int(round(n * coverage)))
    order = sorted(range(n), key=lambda i: instability(picks[i]))
    return order[:k]


def hit_rate(picks: List[EnginePick], idx: List[int]) -> float:
    if not idx:
        return 0.0
    return sum(1 for i in idx if picks[i].won) / len(idx)


def mcnemar_p(a_won_b_lost: int, a_lost_b_won: int) -> float:
    """Two-sided McNemar exact p-value (binomial) on discordant pairs."""
    b = a_won_b_lost
    c = a_lost_b_won
    n = b + c
    if n == 0:
        return 1.0
    # two-sided exact: 2 * P(Bin(n, 0.5) <= min(b, c))
    k = min(b, c)
    tail = sum(math.comb(n, i) for i in range(k + 1)) / (2 ** n)
    return min(1.0, 2 * tail)


def evaluate_gate(picks: List[EnginePick], coverage: float = 0.70) -> dict:
    """Run the acceptance gate. REFUSE on empty pick set."""
    if not picks:
        return {"verdict": "REFUSE", "reason": "empty pick set"}
    conf_idx = set(select_top_confidence(picks, coverage))
    inst_idx = set(select_low_instability(picks, coverage))
    hr_conf = hit_rate(picks, sorted(conf_idx))
    hr_inst = hit_rate(picks, sorted(inst_idx))
    lift_pp = (hr_inst - hr_conf) * 100.0
    # McNemar on the union: discordant pairs where selections disagree
    union = conf_idx | inst_idx
    a_won_b_lost = sum(1 for i in union
                       if (i in inst_idx) and (i not in conf_idx)
                       and picks[i].won)
    a_lost_b_won = sum(1 for i in union
                       if (i in conf_idx) and (i not in inst_idx)
                       and picks[i].won)
    # count wins on one side's exclusive picks vs losses on the other's
    b_disc = sum(1 for i in union if (i in inst_idx) != (i in conf_idx))
    # proper discordant: inst-exclusive won vs conf-exclusive won
    inst_only_won = sum(1 for i in union if i in inst_idx and i not in conf_idx and picks[i].won)
    conf_only_won = sum(1 for i in union if i in conf_idx and i not in inst_idx and picks[i].won)
    inst_only_lost = sum(1 for i in union if i in inst_idx and i not in conf_idx and not picks[i].won)
    conf_only_lost = sum(1 for i in union if i in conf_idx and i not in inst_idx and not picks[i].won)
    # McNemar table: rows = inst correct/incorrect, cols = conf correct/incorrect
    # discordant: inst right & conf wrong  vs  inst wrong & conf right
    d1 = inst_only_won + conf_only_lost
    d2 = inst_only_lost + conf_only_won
    p = mcnemar_p(d1, d2)
    passes = lift_pp >= 1.0 and p < 0.10
    return {
        "module": "2508-07556v2-instability-gate",
        "verdict": "PASS" if passes else "FAIL",
        "coverage": coverage,
        "hit_rate_instability": round(hr_inst, 4),
        "hit_rate_confidence": round(hr_conf, 4),
        "lift_pp": round(lift_pp, 3),
        "lift_pp_required": 1.0,
        "mcnemar_p_two_sided": round(p, 4),
        "mcnemar_p_required": "<0.10",
        "n_discordant": d1 + d2,
        "n_picks": len(picks),
        "n_selected": len(conf_idx),
    }


if __name__ == "__main__":
    import random
    random.seed(62)
    # Synthetic: low-instability picks genuinely win more often.
    picks = []
    for i in range(600):
        stable = random.random() < 0.5
        sd = 0.02 if stable else 0.12
        true_p = 0.62 if stable else 0.50
        seeds = [max(0.01, min(0.99, random.gauss(true_p, sd))) for _ in range(10)]
        conf = sum(seeds) / 10
        picks.append(EnginePick(f"p{i}", conf, seeds, random.random() < true_p))
    print(evaluate_gate(picks))
