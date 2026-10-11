#!/usr/bin/env python3
"""
Module 52: decision/2205-13532-training-disagreement-gate.ts
arXiv: 2205.13532 — "Selective Classification Via Neural Network Training Dynamics"

Faithful Python port of the TypeScript module's core functions + acceptance gate evaluator.

ACCEPTANCE GATE: ADAPT accepted iff adding the disagreement feature improves AuRC
by >=5% relative over the edge-only gate on walk-forward seasons AND the
top-disagreement abstentions are enriched for losses (precision check);
else REJECT the feature.

Status: wired as eval code. NOT EVALUATED on real walk-forward data yet.
"""
from dataclasses import dataclass
from typing import List


@dataclass
class SnapshotPick:
    id: str
    snapshot_probs: List[float]  # predicted win prob at each snapshot (25-50)
    final_prob: float
    final_side: bool
    line_move_against: float     # signed line movement against the pick (points, >= 0)
    won: bool


def late_weighted_disagreement(snap: SnapshotPick) -> float:
    """Mean |snapshotProb - finalProb| weighted to emphasize late snapshots."""
    T = len(snap.snapshot_probs)
    if T == 0:
        return 0.0
    acc = 0.0
    w_sum = 0.0
    for t, sp in enumerate(snap.snapshot_probs):
        w = (t + 1) / T
        acc += w * abs(sp - snap.final_prob)
        w_sum += w
    return acc / w_sum


def flip_line_interaction(snap: SnapshotPick, late_flip_threshold: float = 0.75) -> float:
    """Late-training flip on a pick whose market line moved against it: doubly suspect."""
    T = len(snap.snapshot_probs)
    if T == 0:
        return 0.0
    late_start = int(T * late_flip_threshold)
    late_flip = 0
    for t in range(late_start, T):
        side = snap.snapshot_probs[t] >= 0.5
        if side != snap.final_side:
            late_flip = 1
    disagreement = late_weighted_disagreement(snap)
    return disagreement * (1 + late_flip * min(snap.line_move_against, 3.0))


def nntd_abstain(snap: SnapshotPick, tau: float) -> bool:
    return flip_line_interaction(snap) >= tau


def aurc_for_scores(picks: List[SnapshotPick], scores: List[float]) -> float:
    """Area under the risk-coverage curve. Lower score = publish first. Lower = better."""
    n = len(picks)
    if n == 0:
        return 0.0
    order = sorted(range(n), key=lambda i: scores[i])
    acc = 0.0
    cum_loss = 0
    for k, i in enumerate(order):
        cum_loss += 0 if picks[i].won else 1
        acc += cum_loss / (k + 1)
    return acc / n


def top_disagreement_loss_rate(picks: List[SnapshotPick], k: int) -> float:
    """Loss rate among the top-k suspicion picks."""
    ranked = sorted(picks, key=flip_line_interaction, reverse=True)[: max(1, k)]
    losses = sum(1 for r in ranked if not r.won)
    return losses / len(ranked) if ranked else 0.0


def nntd_gate_passes(
    aurc_with: float,
    aurc_edge_only: float,
    top_k_loss_rate: float,
    base_loss_rate: float,
) -> bool:
    """Gate: AuRC improves >=5% relative AND top-disagreement abstentions enriched for losses."""
    return aurc_with <= 0.95 * aurc_edge_only and top_k_loss_rate > base_loss_rate


def evaluate_gate(
    picks: List[SnapshotPick],
    edge_scores: List[float],
    top_k: int = 50,
) -> dict:
    """Run the acceptance gate. REFUSE if pick set empty or score lengths mismatch."""
    if not picks:
        return {"verdict": "REFUSE", "reason": "empty pick set"}
    if len(edge_scores) != len(picks):
        return {"verdict": "REFUSE",
                "reason": f"edge_scores length {len(edge_scores)} != picks {len(picks)}"}
    suspicion = [flip_line_interaction(p) for p in picks]
    # Combined gate: edge score + suspicion (lower combined = publish first)
    combined = [e + s for e, s in zip(edge_scores, suspicion)]
    aurc_with = aurc_for_scores(picks, combined)
    aurc_edge_only = aurc_for_scores(picks, edge_scores)
    top_k_loss = top_disagreement_loss_rate(picks, top_k)
    base_loss = sum(1 for p in picks if not p.won) / len(picks)
    passes = nntd_gate_passes(aurc_with, aurc_edge_only, top_k_loss, base_loss)
    improvement = (aurc_edge_only - aurc_with) / aurc_edge_only if aurc_edge_only > 0 else 0.0
    return {
        "module": "2205-13532-training-disagreement-gate",
        "verdict": "PASS" if passes else "FAIL",
        "aurc_with": round(aurc_with, 4),
        "aurc_edge_only": round(aurc_edge_only, 4),
        "relative_improvement": round(improvement, 4),
        "improvement_required": 0.05,
        "top_k_loss_rate": round(top_k_loss, 4),
        "base_loss_rate": round(base_loss, 4),
        "enriched_for_losses": top_k_loss > base_loss,
        "n_picks": len(picks),
        "top_k": top_k,
    }


if __name__ == "__main__":
    import random
    random.seed(52)
    picks = []
    for i in range(300):
        T = 30
        final = random.uniform(0.3, 0.8)
        snaps = [max(0.01, min(0.99, final + random.gauss(0, 0.08))) for _ in range(T)]
        picks.append(SnapshotPick(
            f"s{i}", snaps, final, final >= 0.5,
            random.uniform(0, 2), random.random() < final))
    edge_scores = [1.0 - p.final_prob for p in picks]
    print(evaluate_gate(picks, edge_scores))
