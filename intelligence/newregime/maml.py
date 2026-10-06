# Provenance: newregime module — first-order MAML adapter, 1912 (r35).
#
# Implements the MAML side of the syntheses.md S5 "MAML vs NGGP race" and its
# gate: 1912 — MAML 1-5-step adapter on 2-4 games, >=0.02 Brier improvement on
# new-regime (rookie QB / new HC) prediction.
#
# Source docs: ~/workspace/corpus-intelligence/deep/c10/syntheses.md (S5),
#               ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md,
#               ~/workspace/corpus-intelligence/deep/c10/verified-claims.md.
#
# DATA BASIS (honesty header): validated on the SEEDED SYNTHETIC meta-learning
# DGP in dgp.sample_meta_tasks (no real rookie-QB / new-HC game data exists in
# this sandbox). The paper's headline numbers are on toy/finance data, not
# sports (syntheses.md S5) — so is this validation; the gate adopts the
# *adapter* only under the numeric gate, not any paper claim.
#
# DESIGN (INFERENCE, marked): the regime shock is modeled as an INTERCEPT
# shift — a new regime (rookie QB, new HC) moves the *level* of outcomes while
# the shared playbook structure (weights w) transfers. The inner loop therefore
# adapts ONLY the intercept b (1-5 gradient steps on K=4 support examples);
# the outer loop meta-learns (w, b_init). Adapting the full (w, b) on 4
# examples overfits support noise and recovers nothing (measured: brier
# improvement 0.0018); the intercept-only adapter recovers the shock and
# clears the gate with margin (measured 0.027-0.035 across 5 seeds).

"""First-order MAML adapter for new-regime prediction (1912)."""

import numpy as np

from .dgp import sigmoid, sample_meta_tasks, MODULE_SEED


# ---------------------------------------------------------------------------
# Logistic-regression machinery (pure numpy; pandas is binary-incompatible here)
# ---------------------------------------------------------------------------

def _bce_grad(X, y, w, b):
    n = len(y)
    r = sigmoid(X @ w + b) - y
    return X.T @ r / n, float(r.sum() / n)


def _brier(X, y, w, b):
    return float(np.mean((sigmoid(X @ w + b) - y) ** 2))


def _adapt(w, b, X_s, y_s, inner_steps=3, inner_lr=1.0):
    """1-5 inner gradient steps on the support set (K=4 examples).

    INFERENCE: adapts only the regime intercept b. The shared structure w is
    meta-learned and frozen during adaptation — a rookie QB / new HC shifts
    the outcome level, not the whole playbook.
    """
    b_a = float(b)
    for _ in range(inner_steps):
        _, gb = _bce_grad(X_s, y_s, w, b_a)
        b_a = b_a - inner_lr * gb
    return w, b_a


def fit_pooled_baseline(tasks, d, iters=400, lr=0.2):
    """Naive baseline: one logistic model on ALL meta-train data pooled.

    It learns the shared structure but has no per-regime adaptation — exactly
    what a production model does when a rookie QB / new HC arrives and it
    keeps predicting with last season's global intercept.
    """
    X = np.vstack([t["X_s"] for t in tasks] + [t["X_q"] for t in tasks])
    y = np.concatenate([t["y_s"] for t in tasks] + [t["y_q"] for t in tasks])
    w = np.zeros(d)
    b = 0.0
    for _ in range(iters):
        gw, gb = _bce_grad(X, y, w, b)
        w = w - lr * gw
        b = b - lr * gb
    return w, b


def meta_train(tasks, d, meta_iters=400, outer_lr=0.05,
               inner_steps=3, inner_lr=1.0, seed=MODULE_SEED):
    """First-order MAML: meta-learn init theta s.t. `inner_steps` support steps
    (intercept-only, see _adapt) minimize query loss. FOMAML (first-order
    approx): the meta-gradient is the query-loss gradient evaluated at the
    ADAPTED params, applied to theta — ~33% less compute than full
    second-order MAML (syntheses.md S5)."""
    rng = np.random.RandomState(seed)
    w = rng.randn(d) * 0.01
    b = 0.0
    order = np.arange(len(tasks))
    for _ in range(meta_iters):
        rng.shuffle(order)
        for idx in order:
            t = tasks[idx]
            w_a, b_a = _adapt(w, b, t["X_s"], t["y_s"],
                              inner_steps=inner_steps, inner_lr=inner_lr)
            gw, gb = _bce_grad(t["X_q"], t["y_q"], w_a, b_a)
            w = w - outer_lr * gw
            b = b - outer_lr * gb
    return w, b


def maml_new_regime_check(seed=MODULE_SEED, n_tasks=256, d=6,
                          n_support=4, n_query=64,
                          inner_steps=3, inner_lr=1.0):
    """Run the 1912 gate: MAML adapter vs pooled baseline on held-out regimes.

    Returns dict with brier_improvement (mean baseline Brier minus mean
    MAML-adapted Brier over held-out new-regime tasks), plus full provenance.
    Gate: brier_improvement >= 0.02.
    """
    data = sample_meta_tasks(seed=seed, n_tasks=n_tasks, d=d,
                             n_support=n_support, n_query=n_query)
    tasks = data["tasks"]
    rng = np.random.RandomState(seed + 1000)
    idx = rng.permutation(n_tasks)
    train_tasks = [tasks[i] for i in idx[: n_tasks // 2]]
    test_tasks = [tasks[i] for i in idx[n_tasks // 2:]]

    w_base, b_base = fit_pooled_baseline(train_tasks, d)
    w_meta, b_meta = meta_train(train_tasks, d,
                                inner_steps=inner_steps, inner_lr=inner_lr,
                                seed=seed)

    brier_base, brier_maml = [], []
    for t in test_tasks:
        brier_base.append(_brier(t["X_q"], t["y_q"], w_base, b_base))
        w_a, b_a = _adapt(w_meta, b_meta, t["X_s"], t["y_s"],
                          inner_steps=inner_steps, inner_lr=inner_lr)
        brier_maml.append(_brier(t["X_q"], t["y_q"], w_a, b_a))

    brier_base = float(np.mean(brier_base))
    brier_maml = float(np.mean(brier_maml))
    improvement = brier_base - brier_maml

    return {
        "brier_improvement": improvement,
        "brier_baseline": brier_base,
        "brier_maml": brier_maml,
        "gate": 0.02,
        "gate_cleared": improvement >= 0.02,
        "n_test_tasks": len(test_tasks),
        "support_examples_per_task": n_support,
        "inner_steps": inner_steps,
        "method": "first-order MAML (FOMAML); intercept-only inner adapter "
                  "(INFERENCE: regime shock = intercept shift)",
        "baseline": "pooled logistic regression, no per-regime adaptation",
        "data_basis": "seeded synthetic meta-learning DGP "
                      "(dgp.sample_meta_tasks); no real NFL data",
        "seed": seed,
        "provenance": "1912 (r35); syntheses.md S5; buildable-systems.md",
        "inference": ("MAML is the speed shot: few gradient steps, fast "
                      "adaptation for the weekly regime-adaptation loop."),
        "validation_note": ("Full-(w,b) inner adaptation measured 0.0018 "
                            "(overfits 4 support points); intercept-only "
                            "measured 0.027-0.035 across 5 seeds."),
    }
