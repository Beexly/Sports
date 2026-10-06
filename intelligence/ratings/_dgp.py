# Synthetic NFL data-generating process for the ratings module.
#
# Provenance: research-grounded synthetic DGP — effect sizes chosen to mirror the
# paper-reported values the ledger gates encode; NOT real NFL data.
#   - SYS-02 (buildable-systems.md): 1448 G-Elo, Eqs. 43-46; reference LS 0.6224 vs
#     0.6304, RPS 0.2166 vs 0.2200, accuracy 0.6656 vs 0.6375.
#     Source: arxiv-deep/1448-margin-of-victory-differential-skill-ratings.md
#   - SYS-01 (buildable-systems.md): 0213 PlusDC-BT, P(home i beats j) =
#     sigma(u_i - u_j + x_ij^T v); covariates home / rest-differential /
#     travel-altitude / QB-out.
#     Source: arxiv-deep/0213-recent-advances-in-the-bradleyterry-model.md
#   - SYS-26 (buildable-systems.md): 2601.14727 BT production algorithms.
#     Source: dfs/research/2026-09-25/arxiv-deep/2601.14727-bradley-terry-advances.md
#   - SYS-10 (buildable-systems.md): 0049 relativized-feature rule; honest delta
#     +5.2% AUC vs the two-feature absolute (not +21.3% vs single absolute).
#     Source: arxiv-deep/0049-relative-advantage-quantifying-performance-in-noisy.md
#
# Honesty: every backtest function labels its data basis in its docstring and
# result dict ("synthetic_dgp"). Ledger gates are build contracts, not findings —
# the numbers below validate the implementation against the papers' reported
# effect sizes; they are not claims about real NFL games.

import numpy as np

N_TEAMS = 32
GAMES_PER_SEASON = 272   # 32 teams x 17 games / 2
WEEKS = 17
BASE_SEED = 20261002

# True DGP parameters (documented; tuned so the papers' reported deltas are
# reproducible in magnitude on synthetic data).
# Margin <-> log-odds consistency: P(home win|z) = Phi(a*z/s) with the BT
# model P = sigma(z) ~= Phi(z/1.7); hence MARGIN_SCALE ~= MARGIN_NOISE/1.7.
U_SD = 0.32            # season team-strength SD (log-odds units)
DRIFT_WEEKLY = 0.10    # within-season skill random-walk step (log-odds)
HFA = 0.30             # true home-field advantage (log-odds) ~ 57% for even teams
V_REST = 0.045         # log-odds per rest-day differential (home - away)
V_TRAVEL = 0.18        # log-odds per unit of away-team travel/altitude burden (helps home)
V_QBOUT = 0.65         # log-odds penalty when a team's starting QB is out
QB_SD = 0.22           # starter QB effect SD (log-odds)
BACKUP_MEAN = -0.30    # backup QB mean effect (log-odds)
MARGIN_SCALE = 8.0     # margin = MARGIN_SCALE * z + noise (points per log-odds)
MARGIN_NOISE = 13.6    # Gaussian margin noise (points; NFL margin SD ~ 13.6)
# Heavy-tail option: Student-t margins (df=5) model the NFL's excess blowouts
# that motivated 1448's discretization ("robust to outliers"); scaled to the
# same SD as MARGIN_NOISE so the comparison is about shape, not scale.
MARGIN_T_DF = 5
MARGIN_T_SCALE = 10.54  # 13.6 / sqrt(5/3): t_5 variance = df/(df-2) = 5/3
USE_HEAVY_TAIL_MARGINS = True
DRAW_RATE = 0.001      # exact-tie injection rate (NFL f_D ~ 0.001, 1448 Table 1)
QB_OUT_RATE = 0.06     # per team-game probability the starter is out

# 7-category NFL discretization, 1448 implementation plan: Delta'=5, Delta''=10
CAT_EDGES = (-10.0, -5.0, 0.0, 5.0, 10.0)  # -> categories 0..6


def _year_rng(year):
    return np.random.default_rng(BASE_SEED + 7919 * int(year))


def _schedule(rng):
    """17 weekly rounds of random pairings (home/away random)."""
    sched = []
    for week in range(1, WEEKS + 1):
        perm = rng.permutation(N_TEAMS)
        for k in range(N_TEAMS // 2):
            a, b = int(perm[2 * k]), int(perm[2 * k + 1])
            home, away = (a, b) if rng.random() < 0.5 else (b, a)
            sched.append((week, home, away))
    return sched


def gen_season(year):
    """Generate one synthetic NFL season.

    Returns a list of game dicts with keys: year, week, home, away, home_win,
    margin (home perspective, points), category (0..6), rest_diff, travel,
    qb_out_home, qb_out_away, qb_home (id), qb_away (id).
    True outcome model: z = (tau_h + q_h - tau_a - q_a) + HFA
    + V_REST*rest_diff - V_TRAVEL*travel - V_QBOUT*(qb_out_home - qb_out_away);
    P(home win) = sigma(z); margin = MARGIN_SCALE*z + N(0, MARGIN_NOISE).
    """
    rng = _year_rng(year)
    # season team bases + QB assignments
    tau = rng.normal(0.0, U_SD, N_TEAMS)
    q_start = rng.normal(0.0, QB_SD, N_TEAMS)
    q_back = rng.normal(BACKUP_MEAN, 0.12, N_TEAMS)
    # within-season skill drift (random walk, recentered weekly)
    drift = np.zeros((WEEKS + 1, N_TEAMS))
    for w in range(1, WEEKS + 1):
        drift[w] = drift[w - 1] + rng.normal(0.0, DRIFT_WEEKLY, N_TEAMS)
        drift[w] -= drift[w].mean()

    games = []
    for week, home, away in _schedule(rng):
        out_h = rng.random() < QB_OUT_RATE
        out_a = rng.random() < QB_OUT_RATE
        q_h = q_back[home] if out_h else q_start[home]
        q_a = q_back[away] if out_a else q_start[away]
        u_h = tau[home] + drift[week, home] + q_h
        u_a = tau[away] + drift[week, away] + q_a
        rest_diff = float(rng.choice([-7, -3, -2, -1, 0, 1, 2, 3, 7],
                                     p=[0.04, 0.04, 0.03, 0.03, 0.72,
                                        0.03, 0.03, 0.04, 0.04]))
        travel = float(rng.choice([0.0, 0.5, 1.0], p=[0.55, 0.30, 0.15]))
        z = (u_h - u_a) + HFA + V_REST * rest_diff + V_TRAVEL * travel \
            - V_QBOUT * (float(out_h) - float(out_a))
        if rng.random() < DRAW_RATE:
            margin = 0.0
            home_win, tie = False, True  # tie: neither side wins
        else:
            if USE_HEAVY_TAIL_MARGINS:
                mnoise = MARGIN_T_SCALE * rng.standard_t(MARGIN_T_DF)
            else:
                mnoise = rng.normal(0.0, MARGIN_NOISE)
            margin = MARGIN_SCALE * z + mnoise
            tie = False
            home_win = bool(margin > 0)
        category = _categorize(margin, tie)
        games.append({
            "year": int(year), "week": int(week),
            "home": home, "away": away,
            "home_win": home_win, "tie": tie,
            "margin": float(margin), "category": category,
            "rest_diff": rest_diff, "travel": travel,
            "qb_out_home": float(out_h), "qb_out_away": float(out_a),
            "qb_home": f"QB{home}S" if not out_h else f"QB{home}B",
            "qb_away": f"QB{away}S" if not out_a else f"QB{away}B",
        })
    return games


def _categorize(margin, tie=False):
    if tie or margin == 0.0:
        return 3
    e = CAT_EDGES
    if margin < e[0]:
        return 0
    if margin < e[1]:
        return 1
    if margin < e[2]:
        return 2
    if margin <= e[3]:
        return 4
    if margin <= e[4]:
        return 5
    return 6


def gen_seasons(years):
    games = []
    for y in years:
        games.extend(gen_season(y))
    return games


def covariate_row(g):
    """PlusDC covariate vector x_ij (home perspective): [rest_diff, travel,
    qb_out_home, qb_out_away]. True signs: + (rest helps home), + (away travel
    burden helps home), - (home QB out hurts), + (away QB out helps home)."""
    return np.array([g["rest_diff"], g["travel"],
                     g["qb_out_home"], g["qb_out_away"]], dtype=float)
