#!/usr/bin/env python3
"""
Module 63: decision/2510-19672-committee-lcb.ts
arXiv: 2510.19672 — committee disagreement abstention + LCB safe-upgrade gate

Faithful Python port of the TypeScript module's core functions + acceptance gate evaluator.

GATE: Tests two independent mechanisms:
  (a) a K=10 committee-disagreement abstention rule, and
  (b) a lower-confidence-bound safe-upgrade gate for new engine versions.
Pass = "ADAPT the disagreement rule iff it beats the single-threshold rule by >=2
selective-ROI points at matched abstention rate on the chronological test block;
ADAPT the LCB upgrade gate iff it blocks the known-bad candidate while passing the
known-good one."
Fail = each clause gates its own half.

Status: wired as eval code. NOT EVALUATED on real walk-forward data yet.
"""
from dataclasses import dataclass
from typing import List
import math


@dataclass
class CommitteePick:
    id: str
    member_probs: List[float]  # K=10 committee member win probs
    confidence: float           # single-threshold baseline confidence
    edge_units: float           # expected units if taken
    won: bool


def disagreement(pick: CommitteePick) -> float:
    """Committee disagreement: std-dev across K members."""
    m = pick.member_probs
    if len(m) < 2:
        return 0.0
    mean = sum(m) / len(m)
    return math.sqrt(sum((x - mean) ** 2 for x in m) / (len(m) - 1))


def abstain_disagreement(picks: List[CommitteePick], tau: float) -> List[bool]:
    """True = abstain. Abstain when disagreement >= tau."""
    return [disagreement(p) >= tau for p in picks]


def abstain_single_threshold(picks: List[CommitteePick], tau: float) -> List[bool]:
    """True = abstain. Baseline: abstain when confidence < tau."""
    return [p.confidence < tau for p in picks]


def abstention_rate(flags: List[bool]) -> float:
    return sum(flags) / len(flags) if flags else 0.0


def selective_roi(picks: List[CommitteePick], abstain: List[bool]) -> float:
    """ROI in units per taken pick."""
    taken = [p for p, a in zip(picks, abstain) if not a]
    if not taken:
        return 0.0
    return sum(p.edge_units if p.won else -1.0 for p in taken) / len(taken)


def match_abstention_rate(picks: List[CommitteePick], target_rate: float) -> float:
    """Find the single-threshold tau that matches a target abstention rate."""
    confs = sorted(p.confidence for p in picks)
    idx = min(len(confs) - 1, int(target_rate * len(confs)))
    return confs[idx]


def evaluate_disagreement_rule(picks: List[CommitteePick], tau: float) -> dict:
    """Clause (a): committee-disagreement rule vs single-threshold at matched abstention."""
    if not picks:
        return {"verdict": "REFUSE", "reason": "empty pick set"}
    dis_flags = abstain_disagreement(picks, tau)
    rate = abstention_rate(dis_flags)
    base_tau = match_abstention_rate(picks, rate)
    base_flags = abstain_single_threshold(picks, base_tau)
    roi_dis = selective_roi(picks, dis_flags)
    roi_base = selective_roi(picks, base_flags)
    # selective-ROI points: ROI expressed in percentage points of units
    lift_pts = (roi_dis - roi_base) * 100.0
    passes = lift_pts >= 2.0
    return {
        "clause": "disagreement_rule",
        "verdict": "PASS" if passes else "FAIL",
        "disagreement_tau": tau,
        "abstention_rate": round(rate, 4),
        "selective_roi_disagreement": round(roi_dis, 4),
        "selective_roi_baseline": round(roi_base, 4),
        "lift_selective_roi_pts": round(lift_pts, 3),
        "lift_required_pts": 2.0,
        "n_picks": len(picks),
    }


def lcb(values: List[float], alpha: float = 0.05) -> float:
    """One-sided lower confidence bound (normal approx) on the mean."""
    n = len(values)
    if n == 0:
        return float("-inf")
    mean = sum(values) / n
    if n == 1:
        return mean
    sd = math.sqrt(sum((x - mean) ** 2 for x in values) / (n - 1))
    z = 1.6449  # 95% one-sided
    return mean - z * sd / math.sqrt(n)


def evaluate_lcb_upgrade_gate(known_bad_rois: List[float],
                              known_good_rois: List[float]) -> dict:
    """Clause (b): LCB gate must block the known-bad candidate and pass known-good."""
    if not known_bad_rois or not known_good_rois:
        return {"verdict": "REFUSE", "reason": "empty candidate ROI lists"}
    bad_lcb = lcb(known_bad_rois)
    good_lcb = lcb(known_good_rois)
    blocks_bad = bad_lcb <= 0.0
    passes_good = good_lcb > 0.0
    passes = blocks_bad and passes_good
    return {
        "clause": "lcb_upgrade_gate",
        "verdict": "PASS" if passes else "FAIL",
        "known_bad_lcb": round(bad_lcb, 4),
        "known_good_lcb": round(good_lcb, 4),
        "blocks_known_bad": blocks_bad,
        "passes_known_good": passes_good,
        "n_bad": len(known_bad_rois),
        "n_good": len(known_good_rois),
    }


def evaluate_gate(picks: List[CommitteePick], tau: float,
                  known_bad_rois: List[float], known_good_rois: List[float]) -> dict:
    """Full gate: each clause gates its own half."""
    a = evaluate_disagreement_rule(picks, tau)
    b = evaluate_lcb_upgrade_gate(known_bad_rois, known_good_rois)
    return {
        "module": "2510-19672-committee-lcb",
        "clause_a_disagreement": a,
        "clause_b_lcb_upgrade": b,
        "verdict": ("PASS" if (a.get("verdict") == "PASS" and b.get("verdict") == "PASS")
                    else "FAIL"),
    }


if __name__ == "__main__":
    import random
    random.seed(63)
    # Synthetic: high-disagreement picks are genuinely worse.
    picks = []
    for i in range(500):
        noisy = random.random() < 0.4
        sd = 0.15 if noisy else 0.03
        true_p = 0.48 if noisy else 0.60
        members = [max(0.01, min(0.99, random.gauss(true_p, sd))) for _ in range(10)]
        conf = sum(members) / 10
        edge = 0.05 if not noisy else -0.03
        picks.append(CommitteePick(f"c{i}", members, conf, edge, random.random() < true_p))
    bad = [random.gauss(-0.02, 0.05) for _ in range(200)]
    good = [random.gauss(0.04, 0.05) for _ in range(200)]
    import json
    print(json.dumps(evaluate_gate(picks, 0.10, bad, good), indent=1))
