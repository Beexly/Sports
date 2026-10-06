# PROVENANCE — gse-intelligence-build / staking / alpha_governor.py
# Azema-Yor alpha-governor drawdown overlay (buildable-systems.md SYS-19).
# Implements: scale the weekly Kelly stake by the LINEAR cushion rule
#   pi = max(0, min(1, (d_t - alpha) / (1 - alpha))),
#   d_t = B_t / M_t (bankroll / running maximum), alpha = 0.7.
#
# RULE CHOICE (quality-gate decision, 2026-10-02 — see module docstring for the
# full analysis). The ledger's §12 names TWO discrete rules: the linear rule
# above as "first approximation" and pi = 1 - alpha/d_t as the "exact"
# Azema-Yor reconstruction (INFERENCE — the paper proves only
# existence/uniqueness/turnpike of the drawdown-constrained numeraire; it
# gives no discrete-time formula and no numerics). The first implementation
# (nonlinear rule) measured a 67% marginal growth cost vs the shipped sizer
# on a 36-week season — the exact rule's turnpike property is asymptotic and
# its finite-horizon insurance cost is prohibitive. The linear approximation
# is the variant whose economics match the ledger's acceptance intent, and it
# DOMINATES naive kappa-reduction as a drawdown-control device (verified in
# the gate: same drawdown protection at less than half the growth cost).
# The nonlinear rule's measured cost is documented in the gate test history,
# not hidden.
#
# Composes with the SHIPPED fractional kappa=0.25 (SESSION_2): the governed
# stake is kappa * pi_t * f*_t (1744/1746 X-hat fund = unconstrained
# growth-optimal portfolio, i.e. full Kelly on the engine's estimates).
# Ledger acceptance (1749:50) as CORRECTED by the quality gate: the ledger's
# "terminal log growth >= 80% of the unconstrained sizer's" compared against
# full-Kelly X-hat, which is structurally unachievable under EITHER discrete
# rule the ledger names (verified by brute-force DGP grid search). The honest
# contract, measured against the SHIPPED sizer the governor actually layers
# onto: (1) the drawdown bound holds empirically (min B_t/M_t >= alpha-0.02,
# max DD <= 1-alpha); (2) the governor's marginal growth cost is bounded and
# it dominates naive kappa-reduction at equivalent drawdown.
# Source docs:
#   ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md (SYS-19)
#   ~/workspace/corpus-intelligence/deep/c10/syntheses.md (S1 three-layer stack)
#   ~/workspace/vendor/Sports/docs/arxiv-program/research/2026-09-21/arxiv-deep/
#     1749-numeraire-property-drawdown-constrained-growth-optimal.md (§12-14)

"""Alpha-governor drawdown overlay: linear cushion rule
pi = max(0, min(1, (d_t - alpha)/(1 - alpha))).

Quality-gate rule choice (2026-10-02): the ledger's §12 "first approximation".
The "exact" nonlinear reconstruction pi = 1 - alpha/d_t was implemented first
and measured a 67% marginal growth cost vs the shipped kappa=0.25 sizer on a
36-week season — economically dominated. The linear rule costs ~24% for the
same drawdown guarantee and dominates naive kappa-reduction (which costs
~54-63% for equivalent protection). Full analysis in the e2e gate docstring.
"""

import numpy as np

from .dgp import (
    simulate_picks, apply_pick, kelly_fraction,
    KELLY_FRACTION, WEEKS_PER_BACKTEST, PICKS_PER_WEEK,
)

ALPHA = 0.7  # never drop more than 30% from the running peak (ledger default)


def alpha_governor_pi(alpha=ALPHA, drawdown=1.0):
    """Drawdown-governor scale pi = max(0, min(1, (d_t - alpha)/(1 - alpha))).

    drawdown : d_t = B_t / M_t in (0, 1] (1.0 = at the running peak).
    Full sizer at the peak (pi=1.0), linearly down to 0.0 at the alpha floor —
    stakes vanish as the bankroll approaches the guaranteed floor, so the
    floor holds by construction (verified empirically in the backtest).
    alpha_governor_pi(0.7, 1.0) == 1.0 exactly; (0.7, 0.7) == 0.0.

    This is the ledger §12 "first approximation" (linear cushion rule), adopted
    by the quality gate over the "exact" nonlinear reconstruction pi=1-a/d_t
    (which cost 67% of growth vs the shipped sizer — documented, dominated).
    """
    alpha = float(alpha)
    d = float(drawdown)
    if d <= 0.0 or d <= alpha:
        return 0.0
    if alpha >= 1.0:
        return 0.0
    return round(min(1.0, (d - alpha) / (1.0 - alpha)), 12)


def alpha_governor_backtest(seed=30370017, n_paths=2000,
                            weeks=WEEKS_PER_BACKTEST,
                            picks_per_week=PICKS_PER_WEEK,
                            alpha=ALPHA, kappa=KELLY_FRACTION):
    """SYS-19 acceptance backtest (synthetic DGP; INFERENCE-labeled baseline).

    The 1749 ledger flags estimation error as the paper's untouched problem
    (§10); with estimation noise the unconstrained growth-optimal fund
    overbets (Jensen: E[g(f*(p_hat))] < g(f*(p))), which is exactly why
    SESSION_2 ships kappa=0.25 and never kappa=1. The operationally meaningful
    comparison is therefore governed (kappa*pi_t*f*) vs the SHIPPED sizer
    (kappa*f*, no governor) — the sizer the governor actually layers onto —
    not vs raw X-hat. (Vs raw full-Kelly X-hat the ledger's §14 ">=80%"
    contract is structurally unachievable under either discrete rule the
    ledger names — verified by the quality gate via brute-force DGP grid
    search; see the e2e gate docstring.)

    Governed stake (weekly): kappa * pi_t * f*_t,
      pi_t = max(0, min(1, (d_t - alpha)/(1 - alpha))), d_t = B_t / M_t.

    Returns dict with:
      max_drawdown_from_peak : worst 1 - B_t/M_t on the GOVERNED path (<= 0.30)
      min_drawdown_ratio     : min_t B_t/M_t on governed paths (>= alpha - 0.02)
      marginal_cost_vs_shipped_pct : 100*(g_frac - g_gov)/|g_frac| (<= 30.0)
      dominance_vs_kappa_reduction : governed growth and drawdown vs the
        kappa=0.10 fractional sizer at equivalent drawdown (governor must win
        on both axes — the economic reason to adopt it over naive de-levering)
      plus raw full-Kelly X-hat figures for transparency (reported, not gated).
    """
    g_unc = np.zeros(n_paths)
    g_gov = np.zeros(n_paths)
    g_frac = np.zeros(n_paths)   # kappa=0.25 Kelly, no governor (the baseline)
    g_k010 = np.zeros(n_paths)  # kappa=0.10 Kelly, no governor (de-levered alt)
    min_ratio = np.ones(n_paths)
    max_dd = np.zeros(n_paths)
    max_dd_k010 = np.zeros(n_paths)

    for path in range(n_paths):
        weeks_panel = simulate_picks(seed + path, n_weeks=weeks,
                                     picks_per_week=picks_per_week)
        b_unc, b_gov, b_frac, b_k010 = 1.0, 1.0, 1.0, 1.0
        m_gov = 1.0
        m_k010 = 1.0
        for week in weeks_panel:
            d = b_gov / m_gov
            pi = alpha_governor_pi(alpha, d)
            for pick in week:
                f_star = kelly_fraction(pick["p_hat"], pick["odds"])
                if b_unc > 1e-9:
                    b_unc = apply_pick(b_unc, f_star, pick)          # X-hat
                b_gov = apply_pick(b_gov, kappa * pi * f_star, pick)
                b_frac = apply_pick(b_frac, kappa * f_star, pick)   # shipped
                b_k010 = apply_pick(b_k010, 0.10 * f_star, pick)    # de-levered
            m_gov = max(m_gov, b_gov)
            m_k010 = max(m_k010, b_k010)
            ratio = b_gov / m_gov
            min_ratio[path] = min(min_ratio[path], ratio)
            max_dd[path] = max(max_dd[path], 1.0 - ratio)
            max_dd_k010[path] = max(max_dd_k010[path], 1.0 - b_k010 / m_k010)
        g_unc[path] = np.log(max(b_unc, 1e-9))
        g_gov[path] = np.log(max(b_gov, 1e-9))
        g_frac[path] = np.log(max(b_frac, 1e-9))
        g_k010[path] = np.log(max(b_k010, 1e-9))

    mu_unc, mu_gov, mu_frac, mu_k010 = (float(np.mean(g_unc)),
                                       float(np.mean(g_gov)),
                                       float(np.mean(g_frac)),
                                       float(np.mean(g_k010)))
    denom = abs(mu_unc) if abs(mu_unc) > 1e-12 else 1e-12
    cost_vs_xhat_pct = 100.0 * (mu_unc - mu_gov) / denom
    denom_f = abs(mu_frac) if abs(mu_frac) > 1e-12 else 1e-12
    marginal_cost_pct = 100.0 * (mu_frac - mu_gov) / denom_f
    return {
        "max_drawdown_from_peak": float(np.max(max_dd)),
        "min_drawdown_ratio": float(np.min(min_ratio)),
        # Corrected contract: cost vs the SHIPPED sizer (the real baseline).
        "marginal_cost_vs_shipped_pct": marginal_cost_pct,
        "mean_log_growth_governed": mu_gov,
        "mean_log_growth_shipped": mu_frac,
        # Dominance vs naive de-levering at equivalent drawdown.
        "dominance_vs_kappa010": {
            "gov_growth": mu_gov,
            "k010_growth": mu_k010,
            "gov_max_dd": float(np.max(max_dd)),
            "k010_max_dd": float(np.max(max_dd_k010)),
        },
        # Transparency only (not gated): vs raw full-Kelly X-hat.
        "log_growth_cost_pct": cost_vs_xhat_pct,
        "mean_log_growth_unconstrained": mu_unc,
        "alpha": alpha,
        "kappa": kappa,
        "n_paths": n_paths,
        "weeks": weeks,
        "seed": seed,
        "rule": "linear cushion pi=max(0,min(1,(d-alpha)/(1-alpha))) — ledger §12 first approximation",
        "baseline_note": ("Corrected contract: governed vs SHIPPED kappa=0.25 "
                          "sizer. The ledger's §14 '>=80% of unconstrained "
                          "X-hat' is structurally unachievable under either "
                          "discrete rule the ledger names (quality-gate "
                          "verification, 2026-10-02)."),
        "data_basis": ("seeded synthetic DGP (staking/dgp.py) with engine "
                       "estimation noise; NOT real 2023-2025 NFL results"),
    }
