# Provenance: newregime module — few-shot GP classifier, 1902 (r34).
#
# Implements the NGGP side of the syntheses.md S5 "MAML vs NGGP race" and its
# gate: 1902 — NGGP few-shot GP with calibrated uncertainty, >=0.01 Brier gate.
#
# Source docs: ~/workspace/corpus-intelligence/deep/c10/syntheses.md (S5),
#               ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md,
#               ~/workspace/corpus-intelligence/deep/c10/verified-claims.md.
#
# DATA BASIS (honesty header): validated on the SEEDED SYNTHETIC few-shot GP
# DGP in dgp.sample_nggp_tasks (no real rookie-QB / new-HC game data exists in
# this sandbox). The paper's wins concentrate in NLL (calibration) on
# finance/toy data, not sports (syntheses.md S5).
#
# SCOPE NOTE (honest-delta pattern): full NGGP = non-Gaussian GP with a
# neural-parameterized likelihood + FFJORD prior flows. What is implemented
# here is the few-shot *kernel* of the idea — an RBF GP classifier with
# Laplace-approximated calibrated uncertainty, fit per new-regime task on its
# K=8 support points. The neural-likelihood/FFJORD machinery is a
# RESEARCH-GRADE extension (see research_lanes.py), not claimed here.

"""Few-shot GP classifier with calibrated uncertainty (1902)."""

import numpy as np

from .dgp import sigmoid, sample_nggp_tasks, MODULE_SEED


def _rbf(A, B, lengthscale, var):
    d2 = (np.sum(A ** 2, axis=1)[:, None]
          + np.sum(B ** 2, axis=1)[None, :] - 2.0 * A @ B.T)
    return var * np.exp(-0.5 * d2 / lengthscale ** 2)


def _laplace_gp_predict(X_s, y_s, X_q, lengthscale=0.7, var=4.0, jitter=1e-6,
                        newton_iters=25):
    """Binary GP classifier via Laplace approximation (Rasmussen & Williams
    Alg. 5.1). Returns predictive probabilities for X_q."""
    n = len(X_s)
    K = _rbf(X_s, X_s, lengthscale, var) + jitter * np.eye(n)
    f = np.zeros(n)
    for _ in range(newton_iters):
        p = sigmoid(f)
        W = p * (1.0 - p) + 1e-9
        sqrtW = np.sqrt(W)
        B = np.eye(n) + (sqrtW[:, None] * K) * sqrtW[None, :]
        L = np.linalg.cholesky(B)
        b = W * f + (y_s - p)
        a = b - sqrtW * np.linalg.solve(
            L.T, np.linalg.solve(L, sqrtW * (K @ b)))
        f_new = K @ a
        if np.max(np.abs(f_new - f)) < 1e-8:
            f = f_new
            break
        f = f_new
    p = sigmoid(f)
    W = p * (1.0 - p) + 1e-9
    sqrtW = np.sqrt(W)
    B = np.eye(n) + (sqrtW[:, None] * K) * sqrtW[None, :]
    L = np.linalg.cholesky(B)
    Ks = _rbf(X_s, X_q, lengthscale, var)
    Kss = _rbf(X_q, X_q, lengthscale, var)
    # predictive mean of latent f*
    f_mean = Ks.T @ (y_s - p)
    # predictive variance of latent f*
    V = np.linalg.solve(L, sqrtW[:, None] * Ks)
    f_var = np.diag(Kss) - np.sum(V ** 2, axis=0)
    f_var = np.clip(f_var, 1e-9, None)
    # probit-style marginalization of sigmoid over Gaussian latent
    kappa = 1.0 / np.sqrt(1.0 + np.pi * f_var / 8.0)
    return sigmoid(kappa * f_mean)


def nggp_new_regime_check(seed=MODULE_SEED + 7, n_tasks=64,
                          n_support=8, n_query=48):
    """Run the 1902 gate: few-shot GP vs pooled base-rate baseline.

    Baseline = pooled base rate (what a non-adapted model predicts for a brand
    new regime: the league-average outcome rate). GP adapts per task on K=8
    support points with calibrated (Laplace) uncertainty.

    Returns dict with brier_improvement. Gate: brier_improvement >= 0.01.
    """
    data = sample_nggp_tasks(seed=seed, n_tasks=n_tasks,
                             n_support=n_support, n_query=n_query)
    tasks = data["tasks"]

    # pooled base rate from all support data (the no-adaptation baseline)
    all_y = np.concatenate([t["y_s"] for t in tasks])
    base_rate = float(all_y.mean())

    brier_base, brier_gp = [], []
    for t in tasks:
        p_base = np.full_like(t["y_q"], base_rate)
        brier_base.append(float(np.mean((p_base - t["y_q"]) ** 2)))
        p_gp = _laplace_gp_predict(t["X_s"], t["y_s"], t["X_q"])
        brier_gp.append(float(np.mean((p_gp - t["y_q"]) ** 2)))

    brier_base = float(np.mean(brier_base))
    brier_gp = float(np.mean(brier_gp))
    improvement = brier_base - brier_gp

    return {
        "brier_improvement": improvement,
        "brier_baseline": brier_base,
        "brier_nggp": brier_gp,
        "gate": 0.01,
        "gate_cleared": improvement >= 0.01,
        "n_test_tasks": len(tasks),
        "support_examples_per_task": n_support,
        "method": "RBF GP binary classifier, Laplace approximation, "
                  "probit-marginalized predictive probabilities",
        "baseline": "pooled base-rate predictor (no per-regime adaptation)",
        "data_basis": "seeded synthetic few-shot GP DGP "
                      "(dgp.sample_nggp_tasks); no real NFL data",
        "seed": seed,
        "provenance": "1902 (r34); syntheses.md S5; buildable-systems.md",
        "inference": ("NGGP is the calibration shot: better NLL, but O(n^3) "
                      "+ ODE solves per step — offseason prior-refit, not "
                      "the weekly loop."),
        "scope_note": ("Implements the few-shot calibrated-uncertainty "
                       "kernel of NGGP (Laplace GP). The neural-parameterized "
                       "likelihood + FFJORD prior flows of full NGGP are a "
                       "RESEARCH-GRADE extension, not claimed here."),
    }
