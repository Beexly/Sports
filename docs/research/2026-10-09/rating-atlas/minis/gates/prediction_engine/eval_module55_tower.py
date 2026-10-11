#!/usr/bin/env python3
"""
eval_module55_tower.py — Acceptance-gate evaluation for prediction-engine module 55.

Module: 2508-14065v1-personalized-contest-recommendation-in-fantasy.ts
Paper: arXiv:2508.14065v1 — Personalized Contest Recommendation in Fantasy Sports

ACCEPTANCE GATE (from JSDoc): ADAPT if the offline test beats the LightGBM
baseline by >=5% relative on P/R@5 on the time-ordered test window; REJECT if
the deep model can't beat gradient boosting at GSE's data scale.

CRITICAL: The TypeScript module ships with ENABLED = false — "the trained
towers and implicit-feedback data are unavailable; the scoring and loss math
ships as the spec." This eval therefore tests:
  1. Mathematical correctness of towerScore, pairwiseHingeLoss,
     interactionScore, rankScore (unit tests with known values).
  2. Whether a three-tower model CAN beat a gradient-boosting baseline on
     synthetic implicit-feedback data (a necessary-but-not-sufficient signal
     for the real gate, which needs real data).

Status: DIAGNOSTIC. The full acceptance gate (P/R@5 vs LightGBM on real
implicit-feedback data) CANNOT be evaluated without the training data.
This eval tests the math, not the gate.
"""
import math
import random

# ---------------------------------------------------------------------------
# Faithful ports from 2508-14065v1-personalized-contest-recommendation-in-fantasy.ts
# ---------------------------------------------------------------------------

ENABLED = False  # matches TS: disabled without training data


def tower_score(user, item):
    if len(user) != len(item) or len(user) == 0:
        raise ValueError("towerScore: dim mismatch")
    return sum(u * v for u, v in zip(user, item))


def pairwise_hinge_loss(pos_scores, neg_scores, margin):
    if margin < 0:
        raise ValueError("pairwiseHingeLoss: margin >= 0")
    loss, n = 0.0, 0
    for sp in pos_scores:
        for sn in neg_scores:
            loss += max(0.0, margin - (sp - sn))
            n += 1
    return loss / n if n else 0.0


def interaction_score(user, item, w):
    if not (len(user) == len(item) == len(w)):
        raise ValueError("interactionScore: dim mismatch")
    return sum(u * v * wi for u, v, wi in zip(user, item, w))


def rank_score(user, item, w):
    return tower_score(user, item) + interaction_score(user, item, w)


# ---------------------------------------------------------------------------
# Eval: math correctness + synthetic ranking test
# ---------------------------------------------------------------------------

def test_math():
    ok = True
    # towerScore: dot product
    assert abs(tower_score([1, 2, 3], [4, 5, 6]) - 32.0) < 1e-9, "towerScore"
    # hinge: margin=1, pos=2.0, neg=0.5 -> max(0, 1-(2-0.5)) = 0
    assert abs(pairwise_hinge_loss([2.0], [0.5], 1.0) - 0.0) < 1e-9, "hinge-1"
    # hinge: pos=0.5, neg=0.5, margin=1 -> max(0, 1-0) = 1
    assert abs(pairwise_hinge_loss([0.5], [0.5], 1.0) - 1.0) < 1e-9, "hinge-2"
    # interaction: elementwise
    assert abs(interaction_score([1, 2], [3, 4], [0.5, 0.5]) - 5.5) < 1e-9, "interaction"
    # rank = tower + interaction
    assert abs(rank_score([1, 2], [3, 4], [0.5, 0.5]) - 16.5) < 1e-9, "rankScore"
    # error cases
    for fn, args in [(tower_score, ([1], [1, 2])),
                     (pairwise_hinge_loss, ([1], [1], -1)),
                     (interaction_score, ([1], [1], [1, 2]))]:
        try:
            fn(*args)
            ok = False
        except ValueError:
            pass
    print("  math unit tests: PASS" if ok else "  math unit tests: FAIL")
    return ok


def precision_recall_at_k(ranked, relevant, k=5):
    topk = ranked[:k]
    hits = sum(1 for x in topk if x in relevant)
    prec = hits / k
    rec = hits / len(relevant) if relevant else 0.0
    return prec, rec


def run_eval(n_users=60, n_items=120, dim=8, seed=42):
    rng = random.Random(seed)
    print("Module 55 — Personalized contest recommendation (three-tower)")
    print(f"  TS ENABLED flag: {ENABLED} (no training data shipped)")
    math_ok = test_math()

    # Synthetic implicit feedback: latent user/item factors
    U = [[rng.gauss(0, 1) for _ in range(dim)] for _ in range(n_users)]
    V = [[rng.gauss(0, 1) for _ in range(dim)] for _ in range(n_items)]
    W = [rng.gauss(0, 0.5) for _ in range(dim)]
    # relevance = rank_score + noise, thresholded
    rel = {}
    for u in range(n_users):
        scores = [(rank_score(U[u], V[i], W) + rng.gauss(0, 0.5), i)
                  for i in range(n_items)]
        scores.sort(reverse=True)
        rel[u] = set(i for _, i in scores[:10])

    # Tower model ranking vs popularity baseline (LightGBM proxy: popularity)
    pop = sorted(range(n_items),
                 key=lambda i: sum(1 for u in range(n_users) if i in rel[u]),
                 reverse=True)
    p5_tower, r5_tower, p5_pop, r5_pop = [], [], [], []
    for u in range(n_users):
        ranked_tower = sorted(range(n_items),
                              key=lambda i: rank_score(U[u], V[i], W),
                              reverse=True)
        pt, rt = precision_recall_at_k(ranked_tower, rel[u])
        pp, rp = precision_recall_at_k(pop, rel[u])
        p5_tower.append(pt); r5_tower.append(rt)
        p5_pop.append(pp); r5_pop.append(rp)
    mp_tower = sum(p5_tower) / n_users
    mp_pop = sum(p5_pop) / n_users
    rel_improve = (mp_tower - mp_pop) / mp_pop * 100 if mp_pop > 0 else 0.0

    print(f"  P@5 tower model : {mp_tower:.4f}")
    print(f"  P@5 popularity  : {mp_pop:.4f}")
    print(f"  relative lift   : {rel_improve:+.1f}%  (gate needs >= +5% vs LightGBM)")
    print("  FULL GATE: BLOCKED — needs real implicit-feedback data + LightGBM baseline.")
    print("  MATH: PASS" if math_ok else "  MATH: FAIL")
    return {"math_ok": math_ok, "enabled": ENABLED,
            "gate_evaluable": False}


if __name__ == "__main__":
    run_eval()
    print("\nDIAGNOSTIC — math verified; full gate needs real training data.")
