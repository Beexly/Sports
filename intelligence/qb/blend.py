# PROVENANCE — gse-intelligence-build / qb / blend.py
# On-field efficiency blend weights + ranking-feature inventory.
#
# Research: verified-claims.md:419 — week3-engine-readings: fixed
#   0.55/0.15/0.15/0.10/0.05 blend of pass EPA/play residual, rush EPA/play
#   residual, CPOE, explosive-pass rate, INT luck (recovery-rate luck).
#   Source: .../week3-engine-readings-2026-09-21.md:14,17,27.
#
#   *** BRIEF-SOURCED *** — this is a GSE repo brief (an internal engine
#   reading), not a peer-reviewed paper. The task brief marks it as such:
#   "Time-bound (Week 3 2026) but the on-field blend weights are a durable
#   published prior." Treated as a published prior, not as estimated science.
#
# DATA BASIS: the weights are stipulated by the brief — no dataset, no
# estimation. Dark families (off-field/news, the 0.24 share in the brief)
# contribute zero to this on-field blend by construction.

"""On-field efficiency blend (week3-engine-readings prior, brief-sourced)."""

EFFICIENCY_BLEND_WEIGHTS = {
    "pass_epa_resid": 0.55,
    "rush_epa_resid": 0.15,
    "cpoe": 0.15,
    "explosive_pass": 0.10,
    "int_luck": 0.05,
}

# Dark families (off-field/news signals — the brief's 0.24 share) contribute
# zero to the on-field efficiency blend.
DARK_FAMILY_WEIGHT = 0.0


def efficiency_blend_weights():
    """The fixed on-field efficiency blend (sums to 1.0).

    Data basis: week3-engine-readings brief (BRIEF-SOURCED — GSE internal
    reading, not peer-reviewed). 55% pass EPA residual / 15% rush EPA residual
    / 15% CPOE / 10% explosive-pass / 5% INT luck. Dark families contribute
    zero.
    """
    return dict(EFFICIENCY_BLEND_WEIGHTS)


def dark_family_weight():
    """0.0 — dark (off-field/news) families contribute zero to the on-field blend."""
    return DARK_FAMILY_WEIGHT


def apply_efficiency_blend(pass_epa_resid, rush_epa_resid, cpoe,
                           explosive_pass, int_luck):
    """Weighted blend score from the five on-field components.

    Data basis: arithmetic on the brief's weights; component values are
    caller-supplied (residualized per SYS-09 discipline before blending).
    """
    w = EFFICIENCY_BLEND_WEIGHTS
    return (w["pass_epa_resid"] * pass_epa_resid
            + w["rush_epa_resid"] * rush_epa_resid
            + w["cpoe"] * cpoe
            + w["explosive_pass"] * explosive_pass
            + w["int_luck"] * int_luck)


# Features the qb module wires into next-week ranking. xFP/FPOE is REJECTED
# (preregistered holdout failure, Δrho = -0.0165 — see the negative gate) and
# is deliberately absent here; its absence is asserted by test.
_RANKING_FEATURES = [
    "pass_epa_resid",
    "rush_epa_resid",
    "cpoe",
    "explosive_pass",
    "int_luck",
    "rgax",                 # SYS-09 residualized metric (with corrected CIs)
    "int_projection",       # SYS-23 worthy-INT expectation
    "team_sack_rate",       # SYS-23 forced-rates team sacks (never individual)
    "fair_margin_luck_adj",  # SYS-24 luck-adjusted fair margin
]


def ranking_features():
    """Feature names this module wires into next-week ranking.

    Excludes rejected research: xFP/FPOE stays rejected (preregistered
    holdout failure) and never appears here.
    """
    return list(_RANKING_FEATURES)
