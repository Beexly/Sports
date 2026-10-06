# G-Elo margin-of-victory rating (1448) — online Adjacent-Categories rating.
#
# Provenance: SYS-02 (buildable-systems.md). Research: Szczecinski (2022),
# "G-Elo: Generalization of the Elo algorithm by modeling the discretized
# Margin of Victory", arXiv:2010.11187.
# Deep-read source (read-only):
#   ~/workspace/vendor/Sports/docs/arxiv-program/research/2026-09-21/
#   arxiv-deep/1448-margin-of-victory-differential-skill-ratings.md
#   Eqs. 43-46 (closed-form frequency estimators), Eq. 11 (AC model),
#   Eqs. 18-20, 24-25 (Elo-form SG update), Eq. 29 (HFA as theta shift).
# Honesty notes (challenges.md r25/1448): the paper's +2.8pp accuracy gain is
# attributed by the source largely to dropping draw modeling, not to better
# skill estimation; this module decomposes the gain empirically and re-scores
# under the ignorance rule per the 1083 hierarchy (ignorance > Brier > RPS).
#
# Data basis: SYNTHETIC DGP (ratings/_dgp.py) + paper-reported reference values
# (NFL Table 3: G-Elo J=6 LS 0.6224 / RPS 0.2166 / acc 0.6656 vs Elo-Davidson
# LS 0.6304 / RPS 0.2200 / acc 0.6375). Ledger gates are build contracts, not
# findings.

import numpy as np

from ._dgp import N_TEAMS, WEEKS, gen_seasons

J6 = 6            # 7-category NFL discretization (Delta'=5, Delta''=10)
J2 = 2            # Elo-Davidson ternary baseline
N_TRAIN_SEASONS = 5  # paper: 5 training / 5 test seasons, strict season-blocked


# ---------------------------------------------------------------------------
# Closed-form frequency estimators — 1448 Eqs. 43-46
#   xi      = sqrt(f_0 * f_J)                                  (43)
#   eta     = (1/2) log10(f_J / f_0)                           (44)
#   alpha_h = (1/2) log10(f_h * f_{J-h}) - log10(xi)            (45)
#   delta_h = (1/(2 eta)) log10(f_h / f_{J-h})                 (46)
# Strict season-blocked: coefficients estimated on training seasons ONLY.
# ---------------------------------------------------------------------------

def _isotonic_increasing(x):
    """Pool-Adjacent-Violators Algorithm: the L2 projection of x onto
    non-decreasing sequences. Monotonicity repair for the ordinal AC model
    (1448 Eq. 12 symmetry alone does not guarantee it on finite samples)."""
    blocks = [[float(v), 1] for v in x]  # [block_sum, block_count]
    i = 0
    while i < len(blocks) - 1:
        m1 = blocks[i][0] / blocks[i][1]
        m2 = blocks[i + 1][0] / blocks[i + 1][1]
        if m1 <= m2 + 1e-12:
            i += 1
        else:
            blocks[i][0] += blocks[i + 1][0]
            blocks[i][1] += blocks[i + 1][1]
            del blocks[i + 1]
            i = max(i - 1, 0)
    out = []
    for s, c in blocks:
        out.extend([s / c] * c)
    return np.array(out)


def estimate_coefficients(categories, J):
    cats = np.asarray(categories, dtype=int)
    n = len(cats)
    f = np.array([np.mean(cats == h) for h in range(J + 1)], dtype=float)
    f = np.maximum(f, 1e-9)  # guard: every category must be estimable
    xi = float(np.sqrt(f[0] * f[J]))
    eta = 0.5 * float(np.log10(f[J] / f[0]))
    alpha = 0.5 * np.log10(f * f[::-1]) - np.log10(xi)
    with np.errstate(divide="ignore"):
        raw_delta = (0.5 / eta) * np.log10(f / f[::-1]) if eta != 0 else np.zeros(J + 1)
    # Monotonicity repair: the ordinal AC model needs delta increasing in h;
    # finite-sample frequencies can violate it (e.g. f_2 ~= f_4 noise flip).
    # Isotonic regression, then re-impose the Eq. 12 antisymmetry
    # delta_h = -delta_{J-h} (which preserves monotonicity), then anchor
    # delta_0 = -1, delta_J = +1 exactly as Eq. 46 implies.
    delta = _isotonic_increasing(raw_delta)
    delta = (delta - delta[::-1]) / 2.0
    delta = delta - (delta[0] + delta[J]) / 2.0
    scale = (delta[J] - delta[0]) / 2.0 if delta[J] != delta[0] else 1.0
    delta = delta / scale
    return {"eta": eta, "alpha": alpha, "delta": delta, "freq": f, "n": n,
            "delta_raw": raw_delta}


def _delta_tilde(delta):
    d0, dJ = delta[0], delta[-1]
    return (delta - d0) / (dJ - d0)  # score in [0, 1], cf. 1448 Eqs. 18-19


def ac_probs(z, coef):
    """Adjacent-Categories model, 1448 Eq. 11:
    Pr{Y=h | z} = 10^{alpha_h + delta_h z} / sum_l 10^{alpha_l + delta_l z}."""
    alpha, delta = coef["alpha"], coef["delta"]
    ex = np.clip((alpha + delta * z) * np.log(10.0), -30.0, 30.0)
    e = np.exp(ex)
    return e / e.sum()


def expected_score(z, coef):
    """G(z) = E[delta_tilde_Y | z], 1448 Eqs. 20, 24."""
    return float(np.dot(_delta_tilde(coef["delta"]), ac_probs(z, coef)))


def sg_update(theta, home, away, y_obs, coef, k_tilde):
    """One G-Elo online step, 1448 Eq. 25 (Elo form, redefined score):
    theta <- theta + K~ (y_tilde - G(z)); home-field advantage enters as a
    theta shift z = theta_h - theta_a + eta, 1448 Eq. 29."""
    z = theta[home] - theta[away] + coef["eta"]
    err = _delta_tilde(coef["delta"])[y_obs] - expected_score(z, coef)
    theta[home] += k_tilde * err
    theta[away] -= k_tilde * err
    return theta


def elo_davidson_coefficients(categories):
    """J=2 Elo-Davidson frequency coefficients, 1448 Eqs. 47-48:
    eta = (1/2) log10(f_H / f_A); alpha_1 = log10(f_D / sqrt(f_H f_A));
    alpha_0 = alpha_2 = 0; delta = (-1, 0, 1)."""
    cats = np.asarray(categories, dtype=int)
    tern = np.where(cats < 3, 0, np.where(cats == 3, 1, 2))  # A / D / H
    fA = max(np.mean(tern == 0), 1e-9)
    fD = max(np.mean(tern == 1), 1e-9)
    fH = max(np.mean(tern == 2), 1e-9)
    eta = 0.5 * float(np.log10(fH / fA))
    alpha = np.array([0.0, float(np.log10(fD / np.sqrt(fH * fA))), 0.0])
    return {"eta": eta, "alpha": alpha, "delta": np.array([-1.0, 0.0, 1.0])}


def _ternary_actual(g):
    return 0 if (g["margin"] < 0 and not g["tie"]) else (1 if g["tie"] else 2)


def calibrate_k_tilde(train_games, coef, J, k_grid=(0.005, 0.01, 0.02, 0.04, 0.08)):
    """K~ chosen to minimize the ternary log score on TRAINING seasons only
    (1448 Fig. 1: the train-chosen K~ also minimized test LS — clean transfer)."""
    best_k, best_ls = k_grid[0], float("inf")
    for k in k_grid:
        theta = np.zeros(N_TEAMS)
        ls, n = 0.0, 0
        for g in train_games:
            z = theta[g["home"]] - theta[g["away"]] + coef["eta"]
            p = ac_probs(z, coef)
            if J == J6:
                p_tern = np.array([p[0] + p[1] + p[2], p[3], p[4] + p[5] + p[6]])
                y = _ternary_actual(g)
            else:
                p_tern = p
                y = _ternary_actual(g)
            ls += -np.log(max(p_tern[y], 1e-12))
            n += 1
            sg_update(theta, g["home"], g["away"], g["category"] if J == J6 else y,
                      coef, k)
        if n and ls / n < best_ls:
            best_ls, best_k = ls / n, k
    return best_k


def run_online(test_games, coef, J, k_tilde):
    """Online SG through the test seasons. Metrics follow 1448 Table 3: the
    J=6 category distribution is collapsed to the TERNARY (A/D/H) outcome
    before scoring — P(A)=p_0+p_1+p_2, P(D)=p_3, P(H)=p_4+p_5+p_6."""
    theta = np.zeros(N_TEAMS)
    out = []
    for g in test_games:
        z = theta[g["home"]] - theta[g["away"]] + coef["eta"]
        p = ac_probs(z, coef)
        if J == J6:
            p_tern = np.array([p[0] + p[1] + p[2], p[3], p[4] + p[5] + p[6]])
        else:
            p_tern = p
        p_home = float(p_tern[2] / max(p_tern[0] + p_tern[2], 1e-12))
        pred = int(np.argmax(p_tern))
        actual = _ternary_actual(g)
        out.append({"p_home": p_home, "p_tern": p_tern, "pred": pred,
                    "actual": actual, "week": g["week"], "year": g["year"],
                    "tie": g["tie"]})
        sg_update(theta, g["home"], g["away"], g["category"] if J == J6 else actual,
                  coef, k_tilde)
    return out


def _second_half_metrics(preds):
    """1448 evaluation: metrics averaged over the second half of each test
    season (tau = T/2 burn-in). LS/accuracy on the ternary outcome; ignorance
    (1083 re-score) on the binary win prob. Ties excluded from ignorance."""
    tot = {"ls": 0.0, "ig": 0.0, "acc": 0.0, "n": 0, "nig": 0}
    for p in preds:
        if p["week"] <= WEEKS // 2:
            continue
        pc = max(p["p_tern"][p["actual"]], 1e-12)
        tot["ls"] += -np.log(pc)
        tot["acc"] += 1.0 if p["pred"] == p["actual"] else 0.0
        tot["n"] += 1
        if not p["tie"]:
            ph = min(max(p["p_home"], 1e-9), 1 - 1e-9)
            yb = 1.0 if p["actual"] == 2 else 0.0
            tot["ig"] += -(yb * np.log2(ph) + (1 - yb) * np.log2(1 - ph))
            tot["nig"] += 1
    n = max(tot["n"], 1)
    return {"ls": tot["ls"] / n, "ignorance_bits": tot["ig"] / max(tot["nig"], 1),
            "accuracy": tot["acc"] / n, "n": tot["n"]}


def _kappa2_coefficients():
    """Naive-draw Elo-Davidson: Davidson's original kappa=2, i.e. plain Elo's
    implicit ~50%-draw assumption the paper calls 'clearly unrealistic'
    (1448 §4.3). Used ONLY inside the accuracy decomposition to quantify the
    draw-modeling component."""
    return {"eta": 0.0, "alpha": np.array([0.0, np.log10(2.0), 0.0]),
            "delta": np.array([-1.0, 0.0, 1.0])}


def _ternary_acc(test_games, coef, k_tilde):
    theta = np.zeros(N_TEAMS)
    acc = n = 0
    for g in test_games:
        z = theta[g["home"]] - theta[g["away"]] + coef["eta"]
        p = ac_probs(z, coef)
        pred = int(np.argmax(p))
        actual = _ternary_actual(g)
        if g["week"] > WEEKS // 2:
            acc += 1.0 if pred == actual else 0.0
            n += 1
        sg_update(theta, g["home"], g["away"], actual, coef, k_tilde)
    return acc / max(n, 1)


def g_elo_backtest(seasons=range(2019, 2024)):
    """SYS-02 gate: G-Elo J=6 vs Elo-Davidson on a strict season-blocked
    backtest. Coefficients and K~ come from the 5 training seasons before the
    test block ONLY (no peeking); metrics on second halves of test seasons.

    Data basis: SYNTHETIC DGP (ratings/_dgp.py) + paper-reported reference
    values (1448 Table 3, NFL: LS 0.6224 vs 0.6304, RPS 0.2166 vs 0.2200,
    accuracy 0.6656 vs 0.6375). Returns delta_ls >= 0.005 and
    accuracy_gain_pp >= 1.0 on the synthetic validation run.
    """
    seasons = list(seasons)
    first = min(seasons)
    train_years = list(range(first - N_TRAIN_SEASONS, first))
    train_games = gen_seasons(train_years)
    test_games = gen_seasons(seasons)

    coef6 = estimate_coefficients([g["category"] for g in train_games], J6)
    k6 = calibrate_k_tilde(train_games, coef6, J6)
    preds6 = run_online(test_games, coef6, J6, k6)
    m6 = _second_half_metrics(preds6)

    coef2 = elo_davidson_coefficients([g["category"] for g in train_games])
    k2 = calibrate_k_tilde(train_games, coef2, J2)
    preds2 = run_online(test_games, coef2, J2, k2)
    m2 = _second_half_metrics(preds2)

    # Accuracy decomposition (challenges.md r25/1448 honesty requirement):
    #  - draw-modeling component: calibrated-kappa vs naive kappa=2
    #    (plain Elo's implicit ~50%-draw assumption)
    #  - skill-estimation component: G-Elo J=6 MOV-graded updates vs
    #    calibrated Elo-Davidson
    acc_kappa2 = _ternary_acc(test_games, _kappa2_coefficients(), k2)
    draw_modeling_pp = 100.0 * (m2["accuracy"] - acc_kappa2)
    skill_estimation_pp = 100.0 * (m6["accuracy"] - m2["accuracy"])

    return {
        "data_basis": "synthetic_dgp",
        "paper_reference": {"g_elo_ls": 0.6224, "elo_davidson_ls": 0.6304,
                            "g_elo_acc": 0.6656, "elo_davidson_acc": 0.6375},
        "g_elo": {"ls": m6["ls"], "ignorance_bits": m6["ignorance_bits"],
                  "accuracy": m6["accuracy"], "k_tilde": k6, "n": m6["n"]},
        "elo_davidson": {"ls": m2["ls"], "ignorance_bits": m2["ignorance_bits"],
                         "accuracy": m2["accuracy"], "k_tilde": k2},
        "delta_ls": m2["ls"] - m6["ls"],
        "delta_ignorance_bits": m2["ignorance_bits"] - m6["ignorance_bits"],
        "accuracy_gain_pp": 100.0 * (m6["accuracy"] - m2["accuracy"]),
        "accuracy_gain_decomposition": {
            "draw_modeling_pp": draw_modeling_pp,
            "skill_estimation_pp": skill_estimation_pp,
            "note": ("draw_modeling_pp = acc(calibrated Elo-Davidson) - "
                     "acc(kappa=2 Elo-Davidson): the accuracy cost of plain "
                     "Elo's implicit ~50%-draw assumption (1448 Sec. 4.3) on "
                     "near-binary NFL outcomes. skill_estimation_pp = "
                     "acc(G-Elo J=6) - acc(calibrated Elo-Davidson): the "
                     "MOV-graded update edge. The paper's +2.8pp conflates "
                     "both; the ledger gate (accuracy_gain_pp >= 1.0) is "
                     "scored on the fair calibrated-vs-calibrated comparison, "
                     "where only the skill component counts."),
        },
        "seasons": seasons,
    }
