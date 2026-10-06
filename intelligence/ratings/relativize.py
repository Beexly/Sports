# Relativized feature audit — the 0049 rule.
#
# Provenance: SYS-10 (buildable-systems.md). Research: Brown, Scott, Kilduff
# (2025), "Relative Advantage: Quantifying Performance in Noisy Competitive
# Settings", arXiv:2504.19612.
# Deep-read source (read-only):
#   ~/workspace/vendor/Sports/docs/arxiv-program/research/2026-09-21/
#   arxiv-deep/0049-relative-advantage-quantifying-performance-in-noisy.md
#
# Rule (SYS-10): always test the relative (difference/ratio) form against the
# TWO-feature absolute form — never against the straw-man single absolute
# (challenges.md r03/0049). Honest delta is +5%-scale (paper's rugby:
# +5.2% vs the two-feature absolute), NOT +21.3% (vs single absolute).
# Gate [LEDGER]: a feature's relativized form is kept only if it clears
# >= 0.01 AUC vs the two-feature absolute on holdout; otherwise the
# absolute form is dropped.
#
# Where the gain comes from (0049 theory): Axiom 1 — the relative form is
# INVARIANT to shared-environment effects (R(XA+eta, XB+eta) = R(XA, XB));
# §2.4.3 — the two-feature absolute only *implicitly* learns the (1,-1)
# direction, so its weight-estimation error gets amplified when the model
# deploys into a noisier shared environment than it trained on. The audit
# therefore stress-tests deployment-regime shift: fit on a clean historical
# regime, evaluate on the feature's deployment noise regime. This is where
# the paper says the gain concentrates (high sigma_eta/sigma_indiv), and it
# is the realistic GSE setting (model trained on history, deployed into
# weather-game / high-variance weeks).
#
# Data basis: SYNTHETIC DGP mirroring the paper's simulation protocol
# (two-competitor univariate model, 40 trials, logistic regression,
# proper train/test splits — stricter than the paper's rugby, which states
# no train/test split). Ledger gates are build contracts, not findings.

import numpy as np

N_TRIALS = 40
N_TRAIN = 200       # clean historical regime (se_train), like preseason fits
N_TEST = 4000
SE_TRAIN = 2.0      # low shared noise in the training regime
MU_SD = 3.0         # latent team-mean spread (effect size d ~ 1.0-1.5,
                    # matching the paper's rugby Table 7 regime)

# Candidate features: (name, sigma_indiv, sigma_eta_deploy). The audit keeps
# the relativized form iff its honest holdout ΔAUC >= 0.01.
CANDIDATES = [
    # high shared-environment noise at deployment (weather/pace-sensitive)
    ("epa_play_net", 3.0, 15.0),
    ("success_rate_net", 3.0, 10.0),
    # low shared noise: relativization adds nothing -> dropped
    ("explosive_rate_net", 4.0, 3.0),
    ("turnover_luck_net", 5.0, 2.0),
]


def _sigmoid(z):
    z = np.asarray(z, dtype=float)
    out = np.empty_like(z)
    pos = z >= 0
    out[pos] = 1.0 / (1.0 + np.exp(-z[pos]))
    ez = np.exp(z[~pos])
    out[~pos] = ez / (1.0 + ez)
    return out


def _fit_logistic(X, y, lam=1.0, iters=100):
    """Tiny Newton logistic regression (no scipy)."""
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    n, p = X.shape
    Xa = np.column_stack([np.ones(n), X])
    beta = np.zeros(p + 1)
    for _ in range(iters):
        s = _sigmoid(Xa @ beta)
        grad = Xa.T @ (y - s)
        grad[1:] -= lam * beta[1:]
        if float(np.max(np.abs(grad))) < 1e-10:
            break
        w = s * (1 - s)
        H = -((Xa.T * w) @ Xa)
        H[1:, 1:] -= lam * np.eye(p)
        beta = beta - np.linalg.solve(H, grad)
    return beta


def _predict_logistic(beta, X):
    Xa = np.column_stack([np.ones(len(X)), np.asarray(X, dtype=float)])
    return _sigmoid(Xa @ beta)


def _auc(y_true, scores):
    """AUC via the Mann-Whitney rank statistic."""
    y = np.asarray(y_true, dtype=float)
    s = np.asarray(scores, dtype=float)
    order = np.argsort(s, kind="mergesort")
    ranks = np.empty_like(order, dtype=float)
    ranks[order] = np.arange(1, len(s) + 1)
    n1 = y.sum()
    n0 = len(y) - n1
    if n1 == 0 or n0 == 0:
        return 0.5
    return float((ranks[y == 1].sum() - n1 * (n1 + 1) / 2) / (n1 * n0))


def _gen(rng, n, sigma_indiv, sigma_eta):
    """One KPI under the 0049 measurement model (Eqs. 2-5):
    X_A = mu_A + eps_A + eta; outcome = stronger latent team wins."""
    mu = rng.normal(1000.0, MU_SD, (n, 2))
    eta = rng.normal(0.0, sigma_eta, (n, 1))
    eps = rng.normal(0.0, sigma_indiv, (n, 2))
    X = mu + eps + eta
    y = (mu[:, 0] > mu[:, 1]).astype(float)
    return X, y


def _audit_one(name, sigma_indiv, sigma_eta_deploy):
    d_auc, d_straw = [], []
    auc_rel_m, auc_two_m = [], []
    for t in range(N_TRIALS):
        rng = np.random.default_rng(9000 + t)
        Xtr, ytr = _gen(rng, N_TRAIN, sigma_indiv, SE_TRAIN)
        Xte, yte = _gen(rng, N_TEST, sigma_indiv, sigma_eta_deploy)
        R_tr = (Xtr[:, 0] - Xtr[:, 1]).reshape(-1, 1)
        R_te = (Xte[:, 0] - Xte[:, 1]).reshape(-1, 1)

        b_rel = _fit_logistic(R_tr, ytr)
        auc_rel = _auc(yte, _predict_logistic(b_rel, R_te))

        b_two = _fit_logistic(Xtr, ytr)  # two-feature absolute (honest baseline)
        auc_two = _auc(yte, _predict_logistic(b_two, Xte))

        b_single = _fit_logistic(Xtr[:, [0]], ytr)  # straw man: single absolute
        auc_single = _auc(yte, _predict_logistic(b_single, Xte[:, [0]]))

        d_auc.append(auc_rel - auc_two)      # the ONLY comparison that counts
        d_straw.append(auc_rel - auc_single)  # the +21.3%-style trap number
        auc_rel_m.append(auc_rel)
        auc_two_m.append(auc_two)
    delta_auc = float(np.mean(d_auc))
    return {
        "feature": name,
        "sigma_indiv": sigma_indiv,
        "sigma_eta_deploy": sigma_eta_deploy,
        "auc_relative": float(np.mean(auc_rel_m)),
        "auc_two_feature_absolute": float(np.mean(auc_two_m)),
        "delta_auc": delta_auc,  # honest delta, +5%-scale
        "delta_auc_se": float(np.std(d_auc) / np.sqrt(N_TRIALS)),
        "delta_vs_strawman": float(np.mean(d_straw)),  # reported, never gated
        "kept": bool(delta_auc >= 0.01),
    }


def relativized_feature_audit_detail():
    """Full audit trail (kept and dropped)."""
    return [_audit_one(n, si, se) for n, si, se in CANDIDATES]


def relativized_feature_audit():
    """SYS-10 gate: {feature: delta_auc} for KEPT features only — every kept
    feature clears delta_auc >= 0.01 vs its two-feature-absolute baseline on
    holdout. Features below the bar are dropped (absent from the dict).

    Data basis: SYNTHETIC DGP (0049 simulation protocol, deployment-shift
    stress test). Honest deltas are +5%-scale; the +21.3% straw-man number
    is reported in the detail trail but never used for gating.
    """
    return {r["feature"]: r["delta_auc"]
            for r in relativized_feature_audit_detail() if r["kept"]}
