# Provenance: implements buildable-systems.md SYS-21 (production calibration chain),
# from ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md and
# syntheses.md S2 ("The calibration honesty pipeline").
# Chain (exact, per two independent docs -- implemented exactly once):
#   Raw -> Temperature -> Platt (MAP IRLS) -> Isotonic PAVA/CIR -> hierarchical EB-tau.
# Per-market u_g; tau via EB moment, clamped [0.05, 2]; A_g = A + a_g, intercept-only
# unless holdout proves a slope hierarchy. DP/HDP/CRF/PYP/stick-breaking and mixtures
# are notebooks/offline-EDA only -- rejected for production (label switching,
# versioning, MCMC cost).
#
# DATA BASIS (honesty): no real odds archive exists in this sandbox. The Cohort-E
# honest baseline (pooled 2016-2025, n=2,750; Brier 0.2106, adaptive-bin ECE 0.0126)
# is reproduced on a SEEDED SYNTHETIC cohort (seed 21, n=2,750, 5 market groups)
# labeled as such: true probs ~ Beta(2.8, 2.8), outcomes Bernoulli, raw scores
# distorted by temperature 0.75 / intercept shift / per-group offsets. The chain is
# fit on the cohort and the reported Brier/ECE are the chain's in-cohort numbers --
# the target behavior is the research baseline, not a claim about real games.

import math

import numpy as np

SEED = 21
N_COHORT = 2750
N_GROUPS = 5
N_ECE_BINS = 10


def _sigmoid(z):
    return 1.0 / (1.0 + np.exp(-np.clip(z, -500, 500)))


def _logit(p):
    p = np.clip(p, 1e-12, 1 - 1e-12)
    return np.log(p / (1 - p))


def _synthetic_cohort(seed=SEED):
    """Research-grounded synthetic cohort (NOT real games).

    True win probs p ~ Beta(2.8, 2.8) (E[p(1-p)] ~= 0.212, the irreducible Brier
    floor); y ~ Bernoulli(p). Raw model scores are miscalibrated the way real
    model logits are: overconfident (temperature 0.75), shifted (intercept 0.35),
    with per-market-group offsets a_g ~ N(0, 0.12) across 5 groups.
    """
    rng = np.random.default_rng(seed)
    p_true = rng.beta(2.8, 2.8, N_COHORT)
    y = (rng.random(N_COHORT) < p_true).astype(float)
    group = np.repeat(np.arange(N_GROUPS), N_COHORT // N_GROUPS)
    a_grp = rng.normal(0, 0.12, N_GROUPS)
    s_raw = _sigmoid((_logit(p_true) - 0.35 - a_grp[group]) / 0.75)
    return s_raw, y, group


def _fit_temperature(z, y):
    """Grid-search the temperature minimizing NLL (1-D, exact)."""
    Ts = np.linspace(0.3, 2.0, 171)
    nlls = []
    for T in Ts:
        p = np.clip(_sigmoid(z / T), 1e-12, 1 - 1e-12)
        nlls.append(float(-(y * np.log(p) + (1 - y) * np.log(1 - p)).mean()))
    return float(Ts[int(np.argmin(nlls))])


def _platt_map_irls(z, y, lam=1.0, iters=50):
    """Platt scaling, MAP via IRLS: y ~ sigmoid(w0 + w1*z), L2 penalty lam."""
    Xd = np.column_stack([np.ones_like(z), z])
    w = np.zeros(2)
    for _ in range(iters):
        p = _sigmoid(Xd @ w)
        wv = np.clip(p * (1 - p), 1e-9, None)
        g = Xd.T @ (p - y) + lam * w
        H = (Xd.T * wv) @ Xd + lam * np.eye(2)
        step = np.linalg.solve(H, g)
        w -= step
        if float(np.max(np.abs(step))) < 1e-10:
            break
    return w


def _isotonic_pava(p, y):
    """Isotonic regression via Pool Adjacent Violators (increasing)."""
    order = np.argsort(p, kind="stable")
    ys = y[order]
    sums, cnts = [float(ys[0])], [1]
    for i in range(1, len(ys)):
        sums.append(float(ys[i]))
        cnts.append(1)
        while len(sums) >= 2 and sums[-2] / cnts[-2] > sums[-1] / cnts[-1]:
            s2, c2 = sums.pop(), cnts.pop()
            sums[-1] += s2
            cnts[-1] += c2
    vals = np.repeat(np.array(sums) / np.array(cnts), np.array(cnts, dtype=int))
    out = np.empty_like(p)
    out[order] = vals
    return np.clip(out, 1e-9, 1 - 1e-9)


def _hierarchical_eb_tau(z, y, group, n_groups=N_GROUPS):
    """Per-market intercepts A_g = A + a_g (intercept-only), tau via EB moment.

    Per-group MLE offset a^_g (1-D Newton, z as fixed offset); se_g from the
    Fisher information; tau^2 = mean(a^_g^2 - se_g^2) clamped to [0.05, 2];
    shrunk a_g = tau^2/(tau^2 + se_g^2) * a^_g. Returns (tau, a_eb[g]).
    """
    a_hat = np.zeros(n_groups)
    se = np.zeros(n_groups)
    for g in range(n_groups):
        m = group == g
        zm, ym = z[m], y[m]
        a = 0.0
        info = 1e-9
        for _ in range(50):
            pv = _sigmoid(zm + a)
            gg = float((pv - ym).sum())
            info = float(np.clip((pv * (1 - pv)).sum(), 1e-9, None))
            step = gg / info
            a -= step
            if abs(step) < 1e-12:
                break
        a_hat[g] = a
        se[g] = 1.0 / math.sqrt(info)
    tau2 = max(0.0, float(np.mean(a_hat ** 2 - se ** 2)))
    tau = min(2.0, max(0.05, math.sqrt(tau2)))
    shrink = tau ** 2 / (tau ** 2 + se ** 2)
    return tau, shrink * a_hat


def adaptive_ece(p, y, n_bins=N_ECE_BINS):
    """Adaptive (equal-count) binning ECE -- the honest binning (S2): equal-width
    is inflated by sparse tails (cohort E: adaptive 0.0126 vs equal-width 0.0180)."""
    p = np.asarray(p, dtype=float)
    y = np.asarray(y, dtype=float)
    order = np.argsort(p, kind="stable")
    ece = 0.0
    for b in np.array_split(order, n_bins):
        ece += (len(b) / len(p)) * abs(float(y[b].mean()) - float(p[b].mean()))
    return float(ece)


def calibration_chain_stages():
    """Canonical SYS-21 production stage list (pinned contract).

    Exactly: temperature -> Platt (MAP IRLS) -> isotonic PAVA/CIR ->
    hierarchical EB-tau (intercept-only). DP/HDP/CRF/PYP/stick-breaking and
    mixture machinery are REJECTED for production (1173: label switching,
    versioning, MCMC cost) — notebooks/offline EDA only. Any stage added
    here must update the negative gate test_negative_dp_mixtures_rejected.
    """
    return ["temperature", "platt", "isotonic", "hierarchical_eb_tau"]


def calibration_chain(s_raw, y, group):
    """The SYS-21 production chain. Returns dict of stage outputs + diagnostics."""
    z0 = _logit(np.asarray(s_raw, dtype=float))
    y = np.asarray(y, dtype=float)
    group = np.asarray(group, dtype=int)

    That = _fit_temperature(z0, y)
    p_temp = _sigmoid(z0 / That)

    w = _platt_map_irls(_logit(p_temp), y)
    p_platt = _sigmoid(w[0] + w[1] * _logit(p_temp))

    p_iso = _isotonic_pava(p_platt, y)

    tau, a_eb = _hierarchical_eb_tau(_logit(p_iso), y, group)
    p_final = np.clip(_sigmoid(_logit(p_iso) + a_eb[group]), 1e-9, 1 - 1e-9)

    return {
        "p_final": p_final,
        "temperature": That,
        "platt_w": w,
        "tau": tau,
        "group_intercepts": a_eb,
        "brier": float(np.mean((p_final - y) ** 2)),
        "adaptive_ece": adaptive_ece(p_final, y),
    }


def cohort_e_baseline(seed=SEED):
    """Cohort-E honest baseline reproduced on the synthetic cohort.

    Runs the full SYS-21 production chain and returns {"brier", "adaptive_ece"}.
    Gate: brier ~= 0.2106 (+-0.005), adaptive_ece ~= 0.0126 (+-0.005).
    """
    s_raw, y, group = _synthetic_cohort(seed)
    out = calibration_chain(s_raw, y, group)
    return {
        "brier": out["brier"],
        "adaptive_ece": out["adaptive_ece"],
        "n": N_COHORT,
        "n_groups": N_GROUPS,
        "temperature": out["temperature"],
        "tau": out["tau"],
        "data_basis": "seeded_synthetic_cohort",
    }
