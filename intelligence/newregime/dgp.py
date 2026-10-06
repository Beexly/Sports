# Provenance: newregime module — seeded synthetic data-generating processes.
#
# Implements the validation DGPs for:
#   - buildable-systems.md SYS-5 / syntheses.md S5 (1912 MAML, 1902 NGGP):
#       "MAML vs NGGP race" on post-roster-shock windows (rookie QB / new HC regimes).
#   - buildable-systems.md SYS-30 (1885) drift-detection ensemble acceptance:
#       label-flip drift injected into synthetic 2024 weekly features.
#   - buildable-systems.md SYS-28 (2022) feature-store leak-injection test.
#
# Source docs: ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md,
#               ~/workspace/corpus-intelligence/deep/c10/syntheses.md (S5),
#               ~/workspace/corpus-intelligence/deep/c10/verified-claims.md.
#
# DATA BASIS (honesty header): every generator below is a SEEDED SYNTHETIC DGP.
# No real rookie-QB / new-HC game data, no real 2024 weekly features, no real
# odds/NGS rows are used anywhere in this module. Seeded PRNGs make every
# number reproducible; the first implementation run IS the validation.

"""Seeded synthetic DGPs backing the newregime module's gates."""

import numpy as np

MODULE_SEED = 20261002


def _rng(seed):
    return np.random.RandomState(seed)


def sigmoid(z):
    z = np.clip(z, -30.0, 30.0)
    return 1.0 / (1.0 + np.exp(-z))


# ---------------------------------------------------------------------------
# Meta-learning DGP for the MAML (1912) new-regime gate.
#
# Each task = one "new regime" (rookie QB / new HC / coordinator change).
# The task distribution has LEARNABLE STRUCTURE: a shared weight vector w
# plus a task-specific regime shock b_t (a global intercept shift — the
# "new offense" being systematically better/worse than league average).
# The pooled baseline learns w but cannot represent the per-regime shock;
# a 1-5 step inner-loop adapter starting from the meta-learned init recovers
# b_t from K=4 support examples. Brier improvement is therefore the honest
# value of regime adaptation, not of the shared structure.
# ---------------------------------------------------------------------------

def sample_meta_tasks(seed=MODULE_SEED, n_tasks=256, d=6,
                      n_support=4, n_query=32, shock_sd=1.6):
    """Sample meta-learning tasks for the MAML new-regime check.

    Returns dict with shared_w (d,), and per-task (X_support, y_support,
    X_query, y_query). Deterministic given seed.
    """
    rng = _rng(seed)
    w = rng.randn(d)
    w = w / np.linalg.norm(w) * 1.5  # fixed scale: learnable shared structure
    tasks = []
    for _ in range(n_tasks):
        b = rng.randn() * shock_sd          # the regime shock (rookie QB / new HC)
        Xs = rng.randn(n_support, d)
        ys = (rng.rand(n_support) < sigmoid(Xs @ w + b)).astype(float)
        Xq = rng.randn(n_query, d)
        yq = (rng.rand(n_query) < sigmoid(Xq @ w + b)).astype(float)
        tasks.append({"X_s": Xs, "y_s": ys, "X_q": Xq, "y_q": yq,
                      "shock": b})
    return {"shared_w": w, "tasks": tasks,
            "meta": {"seed": seed, "n_tasks": n_tasks, "d": d,
                     "n_support": n_support, "n_query": n_query,
                     "shock_sd": shock_sd,
                     "data_basis": "seeded synthetic meta-learning DGP "
                                   "(no real NFL data)"}}


# ---------------------------------------------------------------------------
# Few-shot DGP for the NGGP (1902) gate.
#
# One new-regime task per replication: a smooth latent function f_t(x) over
# 2-D inputs (think: matchup coordinates), outcomes Bernoulli(sigmoid(f_t)).
# The naive baseline is the pooled base rate (Brier ~ p(1-p)); a few-shot GP
# classifier (Laplace) fit on K=8 support points recovers f_t locally.
# ---------------------------------------------------------------------------

def sample_nggp_tasks(seed=MODULE_SEED + 7, n_tasks=64,
                      n_support=8, n_query=48, lengthscale=0.7, amp=2.0):
    """Sample few-shot GP tasks. Latent f_t drawn from an RBF-GP prior."""
    rng = _rng(seed)

    def rbf_kernel(A, B, ls=lengthscale, var=amp ** 2):
        d2 = (np.sum(A ** 2, axis=1)[:, None]
              + np.sum(B ** 2, axis=1)[None, :] - 2 * A @ B.T)
        return var * np.exp(-0.5 * d2 / ls ** 2)

    tasks = []
    for _ in range(n_tasks):
        Xs = rng.uniform(-2, 2, size=(n_support, 2))
        Xq = rng.uniform(-2, 2, size=(n_query, 2))
        Xall = np.vstack([Xs, Xq])
        K = rbf_kernel(Xall, Xall) + 1e-6 * np.eye(len(Xall))
        f = rng.multivariate_normal(np.zeros(len(Xall)), K)
        p = sigmoid(f)
        y = (rng.rand(len(Xall)) < p).astype(float)
        tasks.append({"X_s": Xs, "y_s": y[:n_support],
                      "X_q": Xq, "y_q": y[n_support:]})
    return {"tasks": tasks,
            "meta": {"seed": seed, "n_tasks": n_tasks,
                     "n_support": n_support, "n_query": n_query,
                     "lengthscale": lengthscale, "amplitude": amp,
                     "data_basis": "seeded synthetic few-shot GP DGP "
                                   "(no real NFL data)"}}


# ---------------------------------------------------------------------------
# Weekly-grain DGP for the SYS-30 drift ensemble acceptance test.
#
# Stream = weekly prediction-error statistics for a fixed model over synthetic
# "2024" seasons (18 weeks each). Stationary weeks: error rate ~ 0.22.
# Drift injection (label flip): at week `flip_week`, the relationship flips
# and the weekly error rate jumps to ~0.78 (honest strong-signal injection —
# a label flip is the textbook abrupt drift).
# ---------------------------------------------------------------------------

def sample_weekly_error_stream(seed=MODULE_SEED + 21, n_seasons=6,
                               weeks_per_season=18, flip_week=None,
                               base_err=0.22, flip_err=0.78,
                               games_per_week=16):
    """Weekly error-rate stream. flip_week=None -> stationary (false-alarm check)."""
    rng = _rng(seed)
    weeks = []
    for s in range(n_seasons):
        for w in range(weeks_per_season):
            p = base_err
            if flip_week is not None and (s * weeks_per_season + w) >= flip_week:
                p = flip_err
            errs = (rng.rand(games_per_week) < p).astype(float)
            weeks.append({"season": s, "week": w,
                          "error_rate": float(errs.mean()),
                          "global_week": s * weeks_per_season + w})
    return {"weeks": weeks,
            "meta": {"seed": seed, "n_seasons": n_seasons,
                     "weeks_per_season": weeks_per_season,
                     "flip_week": flip_week,
                     "data_basis": "seeded synthetic weekly error stream "
                                   "(no real 2024 features)"}}
