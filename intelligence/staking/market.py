# PROVENANCE — gse-intelligence-build / staking / market.py
# Effective-price accounting audit (buildable-systems.md SYS-08, from r06/0283
# "shrouded sin taxes"). Rule: adopt effective-price accounting iff >= 2% of
# +EV picks flip -EV when evaluated at the effective price instead of the
# listed price. The shrouding-heterogeneity prior (shrouding books pass ~90%
# of the tax to consumers vs ~16% non-shrouding) is DESCRIPTIVE heterogeneity,
# not causal — per the brief's SYS-08 provenance note.
# Source docs:
#   ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md (SYS-08)
#   ~/workspace/corpus-intelligence/deep/c10/syntheses.md (Pipeline 4, S1: sizing
#     uses effective price — never the listed line — per 1702/lead-lag)
#   ~/workspace/vendor/Sports/docs/arxiv-program/research/2026-09-21/arxiv-deep/
#     0283-shrouded-sin-taxes.md

"""0283 effective-price flip audit: adopt effective-price accounting when >=2%
of +EV picks flip -EV at the effective price."""

import numpy as np

from .dgp import simulate_picks, WEEKS_PER_BACKTEST, PICKS_PER_WEEK, EDGE_FLOOR

FLIP_ADOPTION_THRESHOLD = 0.02   # 0283 gate: adopt iff flip_rate >= 2%
SHROUD_HAIRCUT = 0.02            # effective payout haircut vs listed (2%):
                                 # fees/execution slippage the listed line hides.
                                 # Calibrated so the audit is informative, not
                                 # decorative; the 90%/16% pass-through split in
                                 # 0283 is descriptive, not causal.


def effective_odds(odds, haircut=SHROUD_HAIRCUT):
    """Effective decimal odds after the shrouded cost haircut."""
    return max(odds * (1.0 - haircut), 1.0)


def effective_price_flip_audit(seed=92830111, n_weeks=WEEKS_PER_BACKTEST,
                               picks_per_week=PICKS_PER_WEEK,
                               haircut=SHROUD_HAIRCUT,
                               threshold=FLIP_ADOPTION_THRESHOLD):
    """0283 adoption audit on the synthetic pick panel.

    For every published (+EV at the listed price) pick, recompute the edge at
    the effective price: ev_eff = p_hat * effective_odds - 1. A pick "flips"
    when ev_listed > 0 but ev_eff < 0. If flip_rate >= 2%, effective-price
    accounting is ADOPTED (all downstream EV/Kelly math uses effective odds).

    Returns dict with flip_rate, adopted, n_picks, n_flips, and the haircut.
    """
    weeks_panel = simulate_picks(seed, n_weeks=n_weeks,
                                 picks_per_week=picks_per_week)
    n_picks = n_flips = 0
    for week in weeks_panel:
        for pick in week:
            n_picks += 1
            ev_listed = pick["p_hat"] * pick["odds"] - 1.0
            ev_eff = pick["p_hat"] * effective_odds(pick["odds"], haircut) - 1.0
            assert ev_listed > 0, "panel holds only published +EV picks"
            if ev_eff < 0.0:
                n_flips += 1
    flip_rate = n_flips / n_picks if n_picks else 0.0
    adopted = bool(flip_rate >= threshold)
    return {
        "flip_rate": flip_rate,
        "adopted": adopted,
        "n_picks": n_picks,
        "n_flips": n_flips,
        "haircut": haircut,
        "threshold": threshold,
        "rule": ("adopt effective-price accounting iff >=2% of +EV picks "
                 "flip -EV at the effective price (0283)"),
        "accounting": ("effective" if adopted else "listed"),
        "provenance_note": ("90% vs 16% pass-through is descriptive "
                            "heterogeneity, not causal (SYS-08)"),
        "data_basis": ("seeded synthetic DGP (staking/dgp.py); NOT real "
                       "market data"),
        "seed": seed,
    }
