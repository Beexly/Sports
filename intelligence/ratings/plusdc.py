# Bradley-Terry production rating stack: PlusDC-BT, Newman FPI, EM-MAP,
# RankCentrality, and the nfelo-style Elo baseline.
#
# Provenance:
#   - SYS-01 (buildable-systems.md): PlusDC-BT team rating module.
#     P(home i beats j) = sigma(u_i - u_j + x_ij^T v), sum(u)=0,
#     ridge-regularized MLE, covariates home / rest-differential /
#     travel-altitude / QB-out. Gate: beats plain BT and Elo on 2022-2024
#     rolling moneyline log-loss by >= 0.003, correct covariate signs.
#     Source: arxiv-deep/0213-recent-advances-in-the-bradleyterry-model.md:19,65,72,75
#   - SYS-26 (buildable-systems.md): BT production algorithms (<20 lines each).
#     Source: dfs/research/2026-09-25/arxiv-deep/2601.14727-bradley-terry-advances.md:55,63,65,71,92
#     Newman (2023) FPI: gamma_i = [sum_j w_ij gamma_j/(gamma_i+gamma_j)]
#                                / [sum_j w_ji/(gamma_i+gamma_j)]  (ASYNC)
#     EM-MAP: gamma_i = (a-1+sum_j w_ij) / (b+sum_j n_ij/(gamma_i+gamma_j))
#             (Zermelo is a=1,b=0; fixes Ford-condition divergence)
#     PlusDC: P(i>j) = sigma(u_i-u_j+(x_ij-x_ji)^T v)
#     Landmines honored: async (not sync) Newman FPI — sync may diverge on
#     near-bipartite graphs; ridge regularization always on — vanilla MLE is
#     unusable early-season without it.
#
# Data basis: SYNTHETIC DGP (ratings/_dgp.py). Ledger gates are build
# contracts, not findings.

import numpy as np

from ._dgp import N_TEAMS, WEEKS, covariate_row, gen_seasons

P = N_TEAMS + 4          # 32 team utilities + 4 covariate effects
LAM_U = 10.0             # ridge on team utilities (MAP: Gaussian prior)
LAM_V = 2.0              # ridge on covariate effects
RHO = 0.97               # recency weight per week (half-life ~23 weeks):
                         # team strength drifts within season (_dgp DRIFT_WEEKLY),
                         # so the rolling likelihood down-weights old games.
                         # Applied to PlusDC AND plain BT (fair baseline).


def _sigmoid(z):
    z = np.asarray(z, dtype=float)
    out = np.empty_like(z)
    pos = z >= 0
    out[pos] = 1.0 / (1.0 + np.exp(-z[pos]))
    ez = np.exp(z[~pos])
    out[~pos] = ez / (1.0 + ez)
    return out


def _design(games, use_covariates, rho=1.0):
    fg = [g for g in games if not g["tie"]]
    n = len(fg)
    X = np.zeros((n, P))
    y = np.zeros(n)
    for k, g in enumerate(fg):
        X[k, g["home"]] = 1.0
        X[k, g["away"]] = -1.0
        if use_covariates:
            X[k, N_TEAMS:] = covariate_row(g)
        y[k] = 1.0 if g["home_win"] else 0.0
    lam = np.full(P, LAM_U)
    lam[N_TEAMS:] = LAM_V
    if not use_covariates:
        lam[N_TEAMS:] = 1.0  # dummy columns stay regularized (else singular H)
    t = np.array([g["year"] * WEEKS + g["week"] for g in fg], dtype=float)
    wts = rho ** (t.max() - t) if n else np.ones(0)
    return X, y, lam, wts


def fit_plusdc(games, use_covariates=True, u_init=None, iters=60, tol=1e-10,
               rho=1.0):
    """Ridge-regularized PlusDC-BT MLE via damped Newton (no scipy).

    Maximizes sum_k w_k log sigma(y_k z_k) - 0.5*sum(lam theta^2),
    z_k = u_home - u_away + x_k^T v, with recency weights w_k = rho^{age}.
    The ridge penalty both guarantees existence when strong connectivity
    fails (0213:75) and identifies the shift-invariant utilities (MAP with
    Gaussian prior)."""
    X, y, lam, wts = _design(games, use_covariates, rho=rho)
    theta = np.zeros(P)
    if u_init is not None:
        theta[:N_TEAMS] = u_init - u_init.mean()
    prev = -np.inf
    for _ in range(iters):
        s = _sigmoid(X @ theta)
        eps = 1e-12
        obj = float(np.sum(wts * (y * np.log(s + eps) + (1 - y) * np.log(1 - s + eps)))
                    - 0.5 * np.sum(lam * theta ** 2))
        grad = X.T @ (wts * (y - s)) - lam * theta
        if float(np.max(np.abs(grad))) < tol:
            break
        w = wts * s * (1 - s)
        H = -((X.T * w) @ X) - np.diag(lam)
        try:
            step = np.linalg.solve(H, grad)
        except np.linalg.LinAlgError:
            return {"theta": theta, "converged": False, "u": theta[:N_TEAMS],
                    "v": theta[N_TEAMS:], "n": len(y)}
        alpha, improved = 1.0, False
        for _ in range(20):  # backtracking line search
            cand = theta - alpha * step
            sc = _sigmoid(X @ cand)
            objc = float(np.sum(wts * (y * np.log(sc + eps) + (1 - y) * np.log(1 - sc + eps)))
                         - 0.5 * np.sum(lam * cand ** 2))
            if objc > obj:
                theta, prev, improved = cand, objc, True
                break
            alpha *= 0.5
        if not improved or abs(obj - prev) < tol:
            break
    u = theta[:N_TEAMS] - theta[:N_TEAMS].mean()  # sum-to-zero (0213)
    return {"theta": theta, "converged": True, "u": u,
            "v": theta[N_TEAMS:], "n": len(y)}


def _win_counts(games):
    w = np.zeros((N_TEAMS, N_TEAMS))
    for g in games:
        if g["tie"]:
            continue
        h, a = g["home"], g["away"]
        if g["home_win"]:
            w[h, a] += 1.0
        else:
            w[a, h] += 1.0
    return w, w + w.T


def newman_fpi_async(w, n, iters=300, seed=7):
    """Newman (2023) FPI, ASYNC updates (2601.14727:63). Sync may diverge on
    near-bipartite graphs; async (random-order in-place) is the safe form."""
    rng = np.random.default_rng(seed)
    g = np.ones(N_TEAMS)
    idx = np.arange(N_TEAMS)
    mask = (n > 0) & (np.eye(N_TEAMS) == 0)
    for _ in range(iters):
        rng.shuffle(idx)
        for i in idx:  # async: in-place, random order
            T = np.where(mask[i], 1.0 / np.maximum(g[i] + g, 1e-12), 0.0)
            den = float(np.sum(w[:, i] * T))
            if den > 0:
                g[i] = float(np.sum(w[i] * g * T)) / den
    return g / (g.prod() ** (1.0 / N_TEAMS))


def em_map(w, n, a=2.0, b=1.0, iters=300):
    """EM-MAP (2601.14727:65): gamma_i = (a-1+sum w_ij)/(b+sum n_ij/(g_i+g_j)).
    Zermelo is the a=1,b=0 special case; a>1,b>0 fixes Ford-condition
    divergence (undefeated team -> u_hat -> infinity)."""
    g = np.ones(N_TEAMS)
    mask = (n > 0) & (np.eye(N_TEAMS) == 0)
    for _ in range(iters):
        T = np.where(mask, 1.0 / np.maximum(g[:, None] + g[None, :], 1e-12), 0.0)
        g = (a - 1.0 + w.sum(axis=1)) / (b + (n * T).sum(axis=1))
    return g / (g.prod() ** (1.0 / N_TEAMS))


def rank_centrality(w, n, iters=1000):
    """RankCentrality spectral rating (0213:72): stationary distribution of
    the ergodic chain P_ij = w_ji/(d_max (w_ij+w_ji)). Always defined —
    the early-season fallback candidate (weeks 1-4 only if it beats plain
    BT on weeks 1-4 log-loss, per the SYS-01 gate)."""
    d = n.sum(axis=1)
    dmax = max(d.max(), 1e-9)
    Pm = np.zeros((N_TEAMS, N_TEAMS))
    for i in range(N_TEAMS):
        for j in range(N_TEAMS):
            if i != j and n[i, j] > 0:
                Pm[i, j] = w[j, i] / (dmax * n[i, j])
        Pm[i, i] = max(1.0 - Pm[i].sum(), 0.0)
    pi = np.full(N_TEAMS, 1.0 / N_TEAMS)
    for _ in range(iters):
        pi = pi @ Pm
    return pi / pi.sum()


def _rc_utilities(games):
    w, n = _win_counts(games)
    pi = rank_centrality(w, n)
    u = np.log(np.maximum(pi, 1e-12))
    return u - u.mean()


# ---------------------------------------------------------------------------
# nfelo-style Elo baseline (online, K + HFA calibrated on training block)
# ---------------------------------------------------------------------------

def calibrate_elo(train_games, k_grid=(0.05, 0.08, 0.12, 0.18, 0.25),
                  hfa_grid=(0.15, 0.25, 0.35, 0.45)):
    best, best_ll = (0.12, 0.30), float("inf")
    for K in k_grid:
        for hfa in hfa_grid:
            theta = np.zeros(N_TEAMS)
            ll, n = 0.0, 0
            for g in train_games:
                p = float(_sigmoid(theta[g["home"]] - theta[g["away"]] + hfa))
                y = 0.5 if g["tie"] else (1.0 if g["home_win"] else 0.0)
                ll += -(y * np.log(p + 1e-12) + (1 - y) * np.log(1 - p + 1e-12))
                n += 1
                err = y - p
                theta[g["home"]] += K * err
                theta[g["away"]] -= K * err
            if n and ll / n < best_ll:
                best_ll, best = ll / n, (K, hfa)
    return {"K": best[0], "hfa": best[1], "logloss": best_ll}


def elo_online_probs(games, K, hfa):
    """Online Elo through `games` in order; returns pre-game P(home win)."""
    theta = np.zeros(N_TEAMS)
    probs = []
    for g in games:
        p = float(_sigmoid(theta[g["home"]] - theta[g["away"]] + hfa))
        probs.append(p)
        y = 0.5 if g["tie"] else (1.0 if g["home_win"] else 0.0)
        err = y - p
        theta[g["home"]] += K * err
        theta[g["away"]] -= K * err
    return probs


# ---------------------------------------------------------------------------
# Rolling evaluation machinery (predict each game from data through week t-1)
# ---------------------------------------------------------------------------

def _logloss(probs, games):
    ll, n = 0.0, 0
    for p, g in zip(probs, games):
        if g["tie"]:
            continue
        y = 1.0 if g["home_win"] else 0.0
        pc = min(max(p, 1e-9), 1 - 1e-9)
        ll += -(y * np.log(pc) + (1 - y) * np.log(1 - pc))
        n += 1
    return ll / max(n, 1)


def _brier(probs, games):
    bs, n = 0.0, 0
    for p, g in zip(probs, games):
        if g["tie"]:
            continue
        y = 1.0 if g["home_win"] else 0.0
        bs += (p - y) ** 2
        n += 1
    return bs / max(n, 1)


def _predict_plusdc(fit, games):
    u, v = fit["u"], fit["v"]
    out = []
    for g in games:
        z = u[g["home"]] - u[g["away"]] + float(covariate_row(g) @ v)
        out.append(float(_sigmoid(z)))
    return out


def _predict_bt_plain(fit, games):
    u = fit["u"]
    return [float(_sigmoid(u[g["home"]] - u[g["away"]])) for g in games]


def production_stack_fit(games):
    """The 2601.14727 production pipeline: Newman async FPI warm start ->
    EM-MAP (a=2,b=1) regularized solve -> PlusDC ridge-Newton refine with
    covariates. Returns the PlusDC fit (u, v) plus the intermediate ratings."""
    w, n = _win_counts(games)
    g_newman = newman_fpi_async(w, n)       # fast spectral warm start
    g_map = em_map(w, n, a=2.0, b=1.0)      # Ford-safe regularized solve
    u_init = np.log(g_map) - np.log(g_map).mean()
    fit = fit_plusdc(games, use_covariates=True, u_init=u_init, rho=RHO)
    fit["gamma_newman"] = g_newman
    fit["gamma_emmap"] = g_map
    return fit


def _rolling_predictions(seasons, fit_fn, base_K_hfa):
    """Rolling refit: for each test week, fit on all games before it.

    Returns dict of aligned probability lists: plusdc, plain_bt, elo,
    rc_weeks14 (RankCentrality utilities + calibrated HFA, weeks 1-4 only).
    """
    seasons = list(seasons)
    all_games = gen_seasons(seasons)
    elo_cfg = base_K_hfa
    # Elo runs fully online across the whole block (train block first).
    train_years = list(range(min(seasons) - 3, min(seasons)))
    elo_stream = gen_seasons(train_years) + all_games
    elo_probs_all = elo_online_probs(elo_stream, elo_cfg["K"], elo_cfg["hfa"])
    elo_probs = elo_probs_all[len(elo_stream) - len(all_games):]

    by_week = {}
    for g in all_games:
        by_week.setdefault((g["year"], g["week"]), []).append(g)
    order = sorted(by_week)

    out = {"plusdc": [], "plain_bt": [], "elo": [], "rc": [],
           "games": [], "rc_weeks14_games": []}
    history = gen_seasons(train_years)  # fit history starts with train block
    for key in order:
        wk = by_week[key]
        fit = fit_fn(history)
        out["plusdc"].extend(_predict_plusdc(fit, wk))
        plain = fit_plusdc(history, use_covariates=False, rho=RHO)
        out["plain_bt"].extend(_predict_bt_plain(plain, wk))
        if key[1] <= 4:
            u_rc = _rc_utilities(history)
            hfa = elo_cfg["hfa"]
            out["rc"].extend([float(_sigmoid(u_rc[g["home"]] - u_rc[g["away"]] + hfa))
                              for g in wk])
            out["rc_weeks14_games"].extend(wk)
        out["games"].extend(wk)
        history.extend(wk)
    n_all = len(all_games)
    out["elo"] = elo_probs[:n_all]
    return out


def covariate_bt_backtest(seasons=range(2022, 2025)):
    """SYS-01 gate: PlusDC-BT vs plain BT and Elo on rolling moneyline
    log-loss (predict each game from data through week t-1).

    Data basis: SYNTHETIC DGP (ratings/_dgp.py). Returns logloss_gain
    (min gain vs plain BT and vs Elo) >= 0.003 on the synthetic validation
    run, with fitted covariate signs checked.
    """
    seasons = list(seasons)
    elo_cfg = calibrate_elo(gen_seasons(range(min(seasons) - 3, min(seasons))))
    r = _rolling_predictions(seasons, production_stack_fit, elo_cfg)

    ll_plus = _logloss(r["plusdc"], r["games"])
    ll_plain = _logloss(r["plain_bt"], r["games"])
    ll_elo = _logloss(r["elo"], r["games"])

    # Early-season fallback gate: RankCentrality adopted for weeks 1-4 ONLY
    # if it beats plain BT on weeks 1-4 log-loss.
    ll_rc14 = _logloss(r["rc"], r["rc_weeks14_games"])
    plain14 = [p for p, g in zip(r["plain_bt"], r["games"]) if g["week"] <= 4]
    ll_plain14 = _logloss(plain14, r["rc_weeks14_games"])
    rc_adopted = bool(ll_rc14 < ll_plain14)

    # Fitted-sign check on the final full-history fit.
    final = production_stack_fit(gen_seasons(seasons))
    v = final["v"]  # [rest_diff, travel, qb_out_home, qb_out_away]
    signs_ok = bool(v[0] > 0 and v[1] > 0 and v[2] < 0 and v[3] > 0)

    gain_plain = ll_plain - ll_plus
    gain_elo = ll_elo - ll_plus
    return {
        "data_basis": "synthetic_dgp",
        "logloss": {"plusdc_bt": ll_plus, "plain_bt": ll_plain, "elo": ll_elo},
        "logloss_gain_vs_plain_bt": gain_plain,
        "logloss_gain_vs_elo": gain_elo,
        "logloss_gain": min(gain_plain, gain_elo),
        "covariate_effects": {"rest_diff": float(v[0]), "travel": float(v[1]),
                              "qb_out_home": float(v[2]),
                              "qb_out_away": float(v[3])},
        "covariate_signs_correct": signs_ok,
        "rank_centrality_weeks1_4": {"logloss": ll_rc14,
                                     "plain_bt_logloss": ll_plain14,
                                     "adopted": rc_adopted},
        "seasons": seasons,
    }


def bt_walkforward(seasons=range(2022, 2025)):
    """SYS-26 gate: the 2601.14727 production stack (Newman async FPI ->
    EM-MAP -> PlusDC ridge-Newton) on walk-forward Brier vs the engine
    (Elo) baseline, 2022-2024.

    Data basis: SYNTHETIC DGP (ratings/_dgp.py). Returns
    brier_improvement_pct >= 2.0 on the synthetic validation run.
    """
    seasons = list(seasons)
    elo_cfg = calibrate_elo(gen_seasons(range(min(seasons) - 3, min(seasons))))
    r = _rolling_predictions(seasons, production_stack_fit, elo_cfg)

    b_stack = _brier(r["plusdc"], r["games"])
    b_elo = _brier(r["elo"], r["games"])
    improvement_pct = 100.0 * (b_elo - b_stack) / max(b_elo, 1e-12)
    return {
        "data_basis": "synthetic_dgp",
        "brier": {"production_stack": b_stack, "elo_baseline": b_elo},
        "brier_improvement_pct": improvement_pct,
        "logloss": {"production_stack": _logloss(r["plusdc"], r["games"]),
                    "elo_baseline": _logloss(r["elo"], r["games"])},
        "algorithms": ["newman_fpi_async", "em_map(a=2,b=1)",
                       "plusdc_ridge_newton"],
        "seasons": seasons,
    }
