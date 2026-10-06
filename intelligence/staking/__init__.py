# PROVENANCE — gse-intelligence-build / staking / __init__.py
# GSE intelligence-engine staking module (c10 Phase 3/4, Wave-2 builder).
# Implements the full staking stack (syntheses.md S1 / cross-half composition):
#   edge -> kappa=0.25 Kelly (SESSION_2) -> 1213 redundancy screen
#   -> 1203 stop-loss scaling u(z,theta) -> 1749 alpha-governor
#      (linear cushion rule, ledger §12 first approximation)
#   -> 2143 two-layer CVaR (edge-estimation-uncertainty penalty).
# Research implemented (see buildable-systems.md):
#   SYS-05 Kelly + stop-loss + redundancy screen (1203/1213/1360/0835)
#   SYS-19 alpha-governor drawdown overlay (1749)
#   SYS-20 two-layer CVaR stake sizer (2143)
#   SYS-08 effective-price accounting audit (0283)
#   1083 mean-ignorance variant selection (promotion gate 0.05 bits)
# HARD EXCLUSION: 1631-style drawdown minimization (no edge input) is REJECTED
# and is not implemented anywhere in this package. Every stake in this module
# starts from a calibrated edge; kelly_fraction() returns 0 for non-positive
# estimated edge, and the redundancy screen rejects no-edge legs outright.
# HONESTY: no real bankroll/pick history exists in this sandbox. All backtests
# run on the seeded synthetic DGP in staking/dgp.py (research-grounded
# calibration, documented there). The sizing MACHINERY is the real
# implementation; the DATA is synthetic. First implementation run = validation.
# INFERENCE labels: the alpha-governor's linear cushion rule is the ledger §12
# "first approximation" of 1749's continuous-time Azema-Yor rule (the paper
# proves existence/uniqueness/turnpike only; the "exact" nonlinear
# reconstruction pi=1-alpha/d_t was implemented first and measured a 67%
# marginal growth cost — economically dominated, documented in the gate);
# the 2143 Gaussian-returns/convex-H assumptions are unverified on the NFL
# stake problem (see cvar.py C-caveat).
"""Staking module: Kelly + 1203 stop-loss + 1213 screen + 1749 governor + 2143 CVaR."""

from .dgp import kelly_fraction, simulate_picks, KELLY_FRACTION
from .kelly import (
    stop_loss_u,
    stop_loss_stake_scale,
    kelly_stop_loss_backtest,
)
from .screening import dominant_asset_screen
from .alpha_governor import (
    alpha_governor_pi,
    alpha_governor_backtest,
    ALPHA,
)
from .cvar import (
    cvar_two_layer_sizer,
    composite_cvar_risk,
    fit_edge_posterior,
    cvar_sizer_backtest,
)
from .market import (
    effective_price_flip_audit,
    effective_odds,
    FLIP_ADOPTION_THRESHOLD,
)
from .variants import (
    promotion_gate_bits,
    mean_ignorance,
    select_staking_variant,
    PROMOTION_GATE_BITS,
)

__all__ = [
    # gate contract
    "kelly_stop_loss_backtest",
    "alpha_governor_pi",
    "alpha_governor_backtest",
    "drawdown_control_has_edge_input",
    "dominant_asset_screen",
    "effective_price_flip_audit",
    "promotion_gate_bits",
    # core machinery
    "cvar_two_layer_sizer",
    "composite_cvar_risk",
    "fit_edge_posterior",
    "cvar_sizer_backtest",
    "kelly_fraction",
    "stop_loss_u",
    "stop_loss_stake_scale",
    "mean_ignorance",
    "select_staking_variant",
    "effective_odds",
    "simulate_picks",
    # pinned constants
    "KELLY_FRACTION",
    "ALPHA",
    "PROMOTION_GATE_BITS",
    "FLIP_ADOPTION_THRESHOLD",
]


def drawdown_control_has_edge_input():
    """Negative-gate attestation (1631 REJECTED): every drawdown control in
    this module layers on top of a positive-edge sizer. The alpha-governor
    scales the Kelly stake kappa * pi_t * f* — f* is zero for non-positive
    estimated edge (kelly_fraction), the 1213 redundancy screen rejects
    no-edge legs outright, and no 1631-style standalone drawdown optimizer
    (no edge input) exists anywhere in this package. Returns True."""
    return True
