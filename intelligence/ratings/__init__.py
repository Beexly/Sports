# ratings — GSE intelligence-engine team-rating module.
#
# Provenance: c10 Phase-2 deep research, merged at
#   ~/workspace/corpus-intelligence/deep/c10/
# (verified-claims.md, syntheses.md, challenges.md, buildable-systems.md).
# Implements:
#   SYS-02 — G-Elo margin-of-victory rating (1448, arXiv:2010.11187),
#            Eqs. 43-46 frequency estimators, Elo-form SG updates.
#   SYS-01 — PlusDC-BT covariate-assisted team rating (0213, arXiv:2601.14727),
#            P(home i beats j) = sigma(u_i - u_j + x_ij^T v), ridge MLE,
#            + QB-decomposition extension u_i = tau_team + q_QB(i) (INFERENCE).
#   SYS-26 — BT production algorithms (2601.14727): Newman async FPI, EM-MAP,
#            PlusDC — each <20 lines.
#   SYS-10 — Relativized feature audit (0049, arXiv:2504.19612): relative form
#            tested against the TWO-feature absolute form; honest delta only.
#
# Data basis for every backtest: SYNTHETIC DGP (ratings/_dgp.py) with
# research-grounded effect sizes + paper-reported reference values. Ledger
# gates are build contracts, not findings — see each function's docstring.
#
# Negative gates honored (tests/e2e/test_research_gates_e2e.py):
#   - xFP/FPOE is NEVER wired as a weighted next-week ranking feature:
#     preregistered holdout failure, delta_rho = -0.0165, 95% CI
#     [-0.0396, 0.0086], n=6,022. ranking_features() excludes it;
#     xfp_fpoe_wired() returns False.
#   - No G-Elo-style draw modeling without decomposition: g_elo_backtest
#     decomposes accuracy_gain_pp into draw-modeling vs skill-estimation.
#   - The +21.3% straw-man number (0049) appears nowhere; the audit gates on
#     the honest +5%-scale delta vs the two-feature absolute.

from .gelo import g_elo_backtest
from .plusdc import bt_walkforward, covariate_bt_backtest
from .qb_decomp import qb_change_moves_rating_without_refit
from .relativize import relativized_feature_audit, relativized_feature_audit_detail

__all__ = [
    "g_elo_backtest",
    "covariate_bt_backtest",
    "qb_change_moves_rating_without_refit",
    "bt_walkforward",
    "relativized_feature_audit",
    "relativized_feature_audit_detail",
    "ranking_features",
    "xfp_fpoe_wired",
]


def ranking_features():
    """Features wired as weighted next-week ranking features.

    Negative gate: xFP/FPOE (xfpoe) is excluded — preregistered holdout
    failure (delta_rho = -0.0165, 95% CI [-0.0396, 0.0086], n=6,022).
    Relativized features below are exactly those kept by
    relativized_feature_audit() (ΔAUC >= 0.01 vs two-feature absolute).
    """
    kept = sorted(relativized_feature_audit())
    return [
        "plusdc_team_utility",      # SYS-01: ridge-MLE BT utility (sum-to-zero)
        "g_elo_skill",              # SYS-02: G-Elo MOV-graded skill
        "qb_decomposed_utility",    # SYS-01 extension (INFERENCE): tau+q_QB
        "rest_differential",        # SYS-01 covariate (fitted sign +)
        "travel_altitude_burden",   # SYS-01 covariate (fitted sign +, away burden)
        "qb_out_indicator",         # SYS-01 covariate (fitted sign -/+)
    ] + [f"relativized_{f}" for f in kept]


def xfp_fpoe_wired():
    """False — xFP/FPOE is refused as a weighted next-week ranking feature.

    Preregistered holdout failure: delta_rho = -0.0165, 95% CI
    [-0.0396, 0.0086], n=6,022. Rejected research stays rejected.
    """
    return False
