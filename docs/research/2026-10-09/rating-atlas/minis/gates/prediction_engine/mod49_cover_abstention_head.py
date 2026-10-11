#!/usr/bin/env python3
"""
Module 49: decision/2104-08281v1-cover-abstention-head.ts
arXiv: 2104.08281v1 — "Controlled Abstention Neural Networks for Identifying Skillful Predictions"

Faithful Python port of the TypeScript module's core functions + acceptance gate evaluator.

ACCEPTANCE GATE: ADAPT if the abstention model beats the baseline on test-window
covered-set accuracy by >=2pp with p<0.05 AND >= the DAC variant (replicating the
paper's NotWrong > DAC ordering); reject if it doesn't beat the baseline.

Status: wired as eval code. NOT EVALUATED on real walk-forward data yet.
"""
import math
from dataclasses import dataclass
from typing import List


@dataclass
class CoverHeadOutputs:
    p_cover: float
    p_no_cover: float
    p_abstain: float


def not_wrong_loss(p_correct: float, p_abstain: float, alpha: float) -> float:
    """L_NW = -log(p_correct + p_abstain) - alpha*log(1 - p_abstain)."""
    p_c = min(max(p_correct, 1e-12), 1.0)
    p_a = min(max(p_abstain, 0.0), 1.0 - 1e-12)
    return -math.log(p_c + p_a) - alpha * math.log(1 - p_a)


def cover_publish_rule(o: CoverHeadOutputs) -> bool:
    """Publish iff argmax != abstain class."""
    return o.p_abstain < max(o.p_cover, o.p_no_cover)


def cover_prediction(o: CoverHeadOutputs) -> str:
    return "cover" if o.p_cover >= o.p_no_cover else "no-cover"


def calibrate_abstain_tau(validation: List[CoverHeadOutputs], target_publish_fraction: float) -> float:
    """Calibrate tau: p_abstain threshold reproducing target publish fraction."""
    if not validation:
        return 0.0
    sorted_pa = sorted(o.p_abstain for o in validation)
    idx = min(len(sorted_pa) - 1, int(math.floor(target_publish_fraction * len(sorted_pa))))
    return sorted_pa[idx]


def covered_accuracy(outputs: List[CoverHeadOutputs], covered: List[bool], tau: float = math.inf) -> float:
    correct = 0
    n = 0
    for o, cov in zip(outputs, covered):
        published = cover_publish_rule(o) if tau == math.inf else o.p_abstain < tau
        if not published:
            continue
        n += 1
        if cov == (cover_prediction(o) == "cover"):
            correct += 1
    return correct / n if n > 0 else 0.0


def cover_abstention_gate_passes(
    acc_not_wrong: float,
    acc_baseline: float,
    acc_dac: float,
    paired_diffs: List[float],
) -> bool:
    """Gate helper: >=2pp over baseline (p<0.05 paired) AND >= DAC variant."""
    if acc_not_wrong - acc_baseline < 0.02:
        return False
    if acc_not_wrong < acc_dac:
        return False
    n = len(paired_diffs)
    if n < 2:
        return False
    mean = sum(paired_diffs) / n
    sd = math.sqrt(sum((d - mean) ** 2 for d in paired_diffs) / (n - 1))
    if sd <= 0:
        return mean > 0
    return mean / (sd / math.sqrt(n)) > 1.645


def evaluate_gate(
    acc_not_wrong: float,
    acc_baseline: float,
    acc_dac: float,
    paired_diffs: List[float],
) -> dict:
    """Run the acceptance gate. Returns verdict dict. REFUSE if inputs missing."""
    if not paired_diffs or len(paired_diffs) < 2:
        return {"verdict": "REFUSE", "reason": "insufficient paired diffs for t-test (need >= 2)"}
    margin_pp = (acc_not_wrong - acc_baseline) * 100
    n = len(paired_diffs)
    mean = sum(paired_diffs) / n
    sd = math.sqrt(sum((d - mean) ** 2 for d in paired_diffs) / (n - 1))
    t_stat = mean / (sd / math.sqrt(n)) if sd > 0 else (float("inf") if mean > 0 else 0.0)
    passes = cover_abstention_gate_passes(acc_not_wrong, acc_baseline, acc_dac, paired_diffs)
    return {
        "module": "2104-08281v1-cover-abstention-head",
        "verdict": "PASS" if passes else "FAIL",
        "margin_pp": round(margin_pp, 3),
        "margin_pp_required": 2.0,
        "t_stat": round(t_stat, 3),
        "t_required": 1.645,
        "beats_dac": acc_not_wrong >= acc_dac,
        "n_paired": n,
    }


if __name__ == "__main__":
    # Smoke test with synthetic inputs (NOT a real evaluation)
    import random
    random.seed(49)
    diffs = [random.gauss(0.025, 0.05) for _ in range(200)]
    result = evaluate_gate(0.575, 0.55, 0.565, diffs)
    print(result)
