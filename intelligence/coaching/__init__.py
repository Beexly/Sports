# PROVENANCE — gse-intelligence-build / coaching / __init__.py
# Coaching tendency engine: team tendency computation + coordinator fingerprints
# (corpus slice c03). See coaching/CONTRACT.md for the c04 interface contract.
"""Coaching tendency engine (c03)."""
from . import common, load, proe, fingerprint, tenures, regime, sequencing
from . import script_elasticity, redzone, tempo, adjustments, dc_pressure, ingame
from . import core_nfl_schemes_and_systems, footballxos_16_category_playbook_engine
from . import (
    whitefield_and_nflverse_metrics_engine,
    ftn_and_snap_deep_intelligence_engine,
    pfr_learned_trench_scheme_contact_engine,
    causal_positional_vulnerability_engine,
    ftn_role_zone_pressure_hazard_engine,
    kicker_air_density_weather_hazard_engine,
    ngs_causal_separation_cpoe_ryoe_engine,
    causal_redzone_and_fourth_down_engine,
    causal_pace_and_penalty_discipline_engine,
    causal_turnover_and_early_down_regression_engine,
    causal_rest_travel_and_market_hfa_engine,
    causal_air_yac_and_rush_success_engine,
    causal_box_shell_and_charting_engine,
    causal_ol_continuity_and_half_splits_engine,
    causal_third_down_cpoe_st_engine,
    causal_sequencing_trench_punting_engine,
    spatial_ghosts_and_step_turn_evaluator,
)
from .provider import CoachingEngineProvider

__all__ = ["common", "load", "proe", "fingerprint", "tenures", "regime",
           "sequencing", "script_elasticity", "redzone", "tempo",
           "adjustments", "dc_pressure", "ingame",
           "core_nfl_schemes_and_systems", "footballxos_16_category_playbook_engine",
           "whitefield_and_nflverse_metrics_engine", "ftn_and_snap_deep_intelligence_engine",
           "pfr_learned_trench_scheme_contact_engine",
           "causal_positional_vulnerability_engine",
           "ftn_role_zone_pressure_hazard_engine",
           "kicker_air_density_weather_hazard_engine",
           "ngs_causal_separation_cpoe_ryoe_engine",
           "causal_redzone_and_fourth_down_engine",
           "causal_pace_and_penalty_discipline_engine",
           "causal_turnover_and_early_down_regression_engine",
           "causal_rest_travel_and_market_hfa_engine",
           "causal_air_yac_and_rush_success_engine",
           "causal_box_shell_and_charting_engine",
           "causal_ol_continuity_and_half_splits_engine",
           "causal_third_down_cpoe_st_engine",
           "causal_sequencing_trench_punting_engine",
           "spatial_ghosts_and_step_turn_evaluator",
           "CoachingEngineProvider"]
