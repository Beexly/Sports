# PROVENANCE — gse-intelligence-build / qb / __init__.py
# Public API for the qb (QB intelligence) module — Wave-2 build.
#
# Research implemented (see ~/workspace/corpus-intelligence/deep/c10/):
#   SYS-09 — rGAX residualization + contamination audit (qb/rgax.py)
#       buildable-systems.md §SYS-09; syntheses.md Pipeline 6;
#       challenges.md r22/1143, r10/0424.
#   SYS-23 — INT prop pricing + sack-prop veto (qb/props.py)
#       buildable-systems.md §SYS-23 (kicker-defense-props).
#   SYS-24 — luck-layer margin pricer (qb/luck.py)
#       buildable-systems.md §SYS-24 (edge-sheet; dossier-v2 r41).
#   week3-engine-readings — on-field efficiency blend (qb/blend.py;
#       BRIEF-SOURCED, see qb/blend.py).
#
# DATA BASIS (honesty): no real NFL dataset exists in this sandbox. All
# quantitative routines run on seeded, documented synthetic DGPs calibrated to
# the research's reported numbers, or on the research's own closed-form
# formulas. Every public function states its data basis in its docstring.

"""QB intelligence module: residualized metrics, prop pricing, luck layer."""

from .rgax import rgax_stability_check
from .props import (
    IndividualSackPropVeto,
    individual_sack_projection,
    int_projection,
    int_projection_detail,
    team_sack_projection,
)
from .luck import (
    NEUTRAL_BAND_HALF_WIDTH,
    fair_margin,
    fumble_recovery_is_noise,
    luck_adjusted_margin,
    luck_band,
    turnover_to_points,
)
from .blend import (
    EFFICIENCY_BLEND_WEIGHTS,
    apply_efficiency_blend,
    dark_family_weight,
    efficiency_blend_weights,
    ranking_features,
)

__all__ = [
    # SYS-09
    "rgax_stability_check",
    # SYS-23
    "IndividualSackPropVeto",
    "individual_sack_projection",
    "int_projection",
    "int_projection_detail",
    "team_sack_projection",
    # SYS-24
    "NEUTRAL_BAND_HALF_WIDTH",
    "fair_margin",
    "fumble_recovery_is_noise",
    "luck_adjusted_margin",
    "luck_band",
    "turnover_to_points",
    # blend
    "EFFICIENCY_BLEND_WEIGHTS",
    "apply_efficiency_blend",
    "dark_family_weight",
    "efficiency_blend_weights",
    "ranking_features",
]
