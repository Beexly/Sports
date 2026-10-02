# PROVENANCE — gse-intelligence-build / staking / cvar.py
# Two-layer CVaR stake sizer (buildable-systems.md SYS-20, from r38/2143
# "composite risk measure framework").
#   outer risk: CVaR_delta over the p-posterior — beta-binomial on the
#               rolling 8-week Brier history. The engine's p_hat enters as the
#               prior (Beta(p_hat*n0, (1-p_hat)*n0)), updated by the window's
#               Binomial(wins | n, p) likelihood.
#   sizer: Kelly stake on the CONSERVATIVE edge p_cons = CVaR_delta(p), the
#          mean of the worst-delta fraction of posterior draws.
#          f_cvar = kappa * (p_cons - q)/(1 - q), floored at 0.
# This is the robust single-bet reduction of the paper's composite-risk idea:
# the outer CVaR over the p-posterior directly penalizes edge-ESTIMATION
# uncertainty (wide posterior -> low p_cons -> small stake), which Kelly
# ignores. It recovers Kelly as the posterior tightens (p_cons -> p_hat) and
# never exceeds Kelly (p_cons <= E[p] <= ... in practice <= p_hat).
# FORMULATION NOTE (honest delta): the paper's CVaR-Expectation (33) in a
# mean-risk tradeoff max_f E[log(1+fX)] - lam*rho(f) is ill-conditioned for
# single-bet sizing — growth(f) and rho(f) are both ~linear in f with similar
# slopes, so lam has a knife-edge (a ~5% change flips the optimum from full
# Kelly to zero). The conservative-edge form captures the same economics
# (size for the tail edge, not the mean edge) with no free risk-aversion
# knob. composite_cvar_risk() below still exposes the full two-layer
# CVaR_delta(E[L|p]) diagnostic; inner="cvar" selects the literal inner-CVaR
# variant (note: it saturates on binary outcomes when epsilon < 1-p).
# VaR-Expectation is NOT implemented: non-convex, no global guarantee.
# C-CAVEAT (from the brief): the paper's experiment assumes Gaussian returns
# and convex-in-x H(x,xi). Both are UNVERIFIED on the NFL stake problem — do
# NOT quote the paper's 0.096%/day (or its 1.65s-solve / N=100K / n=4 timing)
# numbers as NFL numbers.
# Source docs:
#   ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md (SYS-20)
#   ~/workspace/corpus-intelligence/deep/c10/syntheses.md (S1 three-layer stack)
#   ~/workspace/vendor/Sports/docs/arxiv-program/research/2026-09-21/arxiv-deep/
#     2143-composite-risk-measure-framework.md

"""Two-layer CVaR stake sizer (2143): CVaR_delta over the p-posterior of the
inner outcome risk. Convex; VaR-Expectation refused."""

import numpy as np

from .dgp import kelly_fraction, KELLY_FRACTION

PRIOR_A = 1.0
PRIOR_B = 1.0   # Beta(1,1) prior -> beta-binomial posterior on win counts


def fit_edge_posterior(brier_history, p_hat_prior=0.5, prior_strength=20.0):
    """Beta posterior over the engine's true win probability.

    brier_history: iterable of (forecast_prob, outcome_0/1) over the rolling
    8-week window. The engine's current p_hat enters as the PRIOR
    (Beta(p_hat*n0, (1-p_hat)*n0), n0 = prior_strength), updated by the
    window's Binomial(wins | n, p) likelihood — the beta-binomial posterior.
    This anchors the posterior at the engine's estimate (rather than letting
    a few unlucky outcomes drag it to zero) while the width still reflects
    how much realization evidence backs the estimate.
    """
    hist = list(brier_history)
    wins = sum(1 for _, y in hist if y == 1)
    n = len(hist)
    a0 = float(p_hat_prior) * float(prior_strength)
    b0 = (1.0 - float(p_hat_prior)) * float(prior_strength)
    return (a0 + wins, b0 + n - wins)


def _inner_risk(p_draws, f, odds, inner, epsilon=0.10):
    """Inner risk of the loss L(f) = -log(1+fX) given posterior draws p.

    p_draws: array of win-probability draws; f: stake fraction (scalar);
    odds: decimal. Returns array of inner-risk values, one per draw.
    Binary market model F: X = odds-1 w.p. p, -1 w.p. 1-p.
    """
    p = np.asarray(p_draws, dtype=float)
    b = odds - 1.0
    l_win = -np.log(max(1.0 + f * b, 1e-12))
    l_loss = -np.log(max(1.0 - f, 1e-12))
    if inner == "expectation":
        return p * l_win + (1.0 - p) * l_loss
    if inner == "cvar":
        # Analytic CVaR_epsilon of a two-atom loss (SAA converges to this).
        # Losses ordered: l_loss >= l_win for any +EV-or-fair f in (0,1).
        eps = float(epsilon)
        w_loss = 1.0 - p
        # tail mass beyond the (1-eps)-quantile
        tail_from_loss = np.minimum(w_loss, eps)
        tail_from_win = np.maximum(eps - w_loss, 0.0)
        return (tail_from_loss * l_loss + tail_from_win * l_win) / eps
    raise ValueError(
        f"inner={inner!r} not supported: VaR-Expectation is non-convex with "
        "no global guarantee (2143) and is refused by this module.")


def _empirical_cvar(values, delta):
    """Empirical CVaR_delta = mean of the worst delta-fraction of values."""
    v = np.sort(np.asarray(values, dtype=float))[::-1]
    m = max(1, int(np.ceil(delta * v.size)))
    return float(np.mean(v[:m]))


def composite_cvar_risk(f, p_draws, odds, delta=0.10, inner="cvar",
                        epsilon=0.10):
    """Two-layer composite risk rho(f) = CVaR_delta^p~post[ inner_risk(f; p) ]."""
    inner_vals = _inner_risk(np.asarray(p_draws, dtype=float), float(f),
                             float(odds), inner, epsilon=epsilon)
    return _empirical_cvar(inner_vals, delta)


def cvar_two_layer_sizer(p_hat, odds, brier_history, delta=0.25,
                         kappa=KELLY_FRACTION, n_outer=400, seed=21430007):
    """Size a stake by Kelly on the outer-CVaR conservative edge.

    p_cons = CVaR_delta(p) over the p-posterior = mean of the worst-delta
    fraction of posterior draws (beta-binomial: p_hat-prior updated by the
    rolling 8-week Brier history). Stake = kappa * (p_cons - q)/(1 - q),
    floored at 0, where q = 1/odds.

    This penalizes edge-ESTIMATION uncertainty (the outer layer), which Kelly
    ignores: a wide posterior (little/conflicting history) pushes p_cons
    below p_hat and shrinks the stake; a tight posterior recovers Kelly
    (p_cons -> p_hat). It never exceeds Kelly and never chases luck above it.

    p_hat        : engine win-probability estimate (posterior prior mean).
    odds         : decimal odds.
    brier_history: rolling 8-week (forecast, outcome) pairs -> p-posterior.
    delta        : outer CVaR level over the p-posterior (default 0.10).
    kappa        : fractional-Kelly cap (SHIPPED 0.25; never kappa=1).
    """
    a, b = fit_edge_posterior(brier_history, p_hat_prior=p_hat)
    p_bar = a / (a + b)
    rng = np.random.default_rng(seed)
    p_draws = rng.beta(a, b, size=n_outer)
    # Outer CVaR_delta: mean of the worst-delta fraction of p draws.
    p_sorted = np.sort(p_draws)
    m = max(1, int(np.ceil(delta * p_sorted.size)))
    p_cons = float(np.mean(p_sorted[:m]))
    q = 1.0 / float(odds)
    f_star = kappa * max(0.0, (p_cons - q) / (1.0 - q)) if q < 1.0 else 0.0
    b_odds = float(odds) - 1.0
    growth = float(p_hat * np.log(max(1.0 + f_star * b_odds, 1e-12))
                   + (1.0 - p_hat) * np.log(max(1.0 - f_star, 1e-12)))
    return {
        "stake_fraction": float(f_star),
        "kelly_fraction_full": kelly_fraction(p_hat, odds),
        "kelly_cap": kappa * kelly_fraction(p_hat, odds),
        "conservative_edge_prob": p_cons,
        "expected_log_growth": growth,
        "posterior_a": a,
        "posterior_b": b,
        "posterior_mean": p_bar,
        "odds": odds,
        "delta": delta,
        "kappa": kappa,
        "n_outer": n_outer,
        "seed": seed,
        "c_caveat": ("paper assumes Gaussian returns and convex-in-x H(x,xi): "
                     "UNVERIFIED on the NFL stake problem; paper's 0.096%/day "
                     "and 1.65s/N=100K figures are the trading experiment, "
                     "not NFL numbers"),
        "data_basis": "p-posterior from the supplied Brier history (synthetic in tests)",
    }


def cvar_sizer_backtest(seed=777001, n_paths=200, weeks=36,
                        picks_per_week=6, kappa=KELLY_FRACTION,
                        delta=0.25):
    """SYS-20 acceptance probe (synthetic DGP): two-layer CVaR sizer vs
    kappa=0.25 Kelly. The sizer's p-posterior is fit on each path's own
    realized pick history (rolling window), so edge-estimation uncertainty is
    priced from the path itself. Returns growth and drawdown for both arms."""
    from .dgp import simulate_picks, apply_pick, WEEKS_PER_BACKTEST, PICKS_PER_WEEK
    g_kelly = np.zeros(n_paths)
    g_cvar = np.zeros(n_paths)
    dd_kelly = np.zeros(n_paths)
    dd_cvar = np.zeros(n_paths)
    for path in range(n_paths):
        panel = simulate_picks(seed + path, n_weeks=weeks,
                               picks_per_week=picks_per_week)
        b_k, b_c = 1.0, 1.0
        pk_k, pk_c = 1.0, 1.0
        history = []  # (p_hat, outcome) rolling 8-week window
        for wi, week in enumerate(panel):
            for pick in week:
                f_k = kelly_fraction(pick["p_hat"], pick["odds"])
                res = cvar_two_layer_sizer(
                    pick["p_hat"], pick["odds"], history,
                    delta=delta, kappa=kappa,
                    n_outer=200, seed=seed + path * 100003 + wi)
                f_c = res["stake_fraction"]
                b_k = apply_pick(b_k, kappa * f_k, pick)
                b_c = apply_pick(b_c, f_c, pick)
                history.append((pick["p_hat"], 1 if pick["win"] else 0))
            history = history[-(8 * picks_per_week):]
            pk_k = max(pk_k, b_k)
            pk_c = max(pk_c, b_c)
            dd_kelly[path] = max(dd_kelly[path], 1.0 - b_k / pk_k)
            dd_cvar[path] = max(dd_cvar[path], 1.0 - b_c / pk_c)
        g_kelly[path] = np.log(max(b_k, 1e-12))
        g_cvar[path] = np.log(max(b_c, 1e-12))
    return {
        "mean_log_growth_kelly": float(np.mean(g_kelly)),
        "mean_log_growth_cvar": float(np.mean(g_cvar)),
        "max_drawdown_kelly": float(np.max(dd_kelly)),
        "max_drawdown_cvar": float(np.max(dd_cvar)),
        "mean_drawdown_kelly": float(np.mean(dd_kelly)),
        "mean_drawdown_cvar": float(np.mean(dd_cvar)),
        "growth_ratio_cvar_vs_kelly": (
            float(np.mean(g_cvar) / np.mean(g_kelly))
            if np.mean(g_kelly) > 0 else 0.0),
        "n_paths": n_paths,
        "kappa": kappa, "delta": delta,
        "seed": seed,
        "data_basis": "seeded synthetic DGP (staking/dgp.py); NOT real NFL data",
    }
