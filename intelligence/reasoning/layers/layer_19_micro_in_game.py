"""
layer_19_micro_in_game.py — Layer 19: Motion-at-Snap, Receiver Separation & Dynamic Kickoff Drive Starts
Consumes `intelligence/coaching/core_nfl_schemes_and_systems.py`.
"""

from __future__ import annotations

from typing import Any

from intelligence.coaching.core_nfl_schemes_and_systems import GSI_CTE_AND_HEAD_TRAUMA_PRIORS

from ._base import build_layer_output

LAYER_ID = 19
LAYER_SLUG = "layer_19_micro_in_game"
DEFAULT_INPUT_KEYS = (
    "home_motion_at_snap_rate",
    "away_motion_at_snap_rate",
    "home_avg_target_separation_yds",
    "dynamic_kickoff_avg_start_ydline",
)
OUTPUT_SIGNAL_KEYS = (
    "home_motion_at_snap_epa_delta",
    "away_motion_at_snap_epa_delta",
    "home_avg_target_separation_yds",
    "dynamic_kickoff_avg_start_ydline",
    "dynamic_kickoff_concussion_reduction_pct",
)
SOURCE_DATASETS = ("nflverse_ftn_charting_2026", "core_nfl_schemes_and_systems")
FRESHNESS_RULE = "<= 48h FTN charting motion-at-snap & Dynamic Kickoff field position"
CONSUMER = "L2_interaction_synthesis"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    home_motion = float(game_input.get("home_motion_at_snap_rate", 0.31))
    away_motion = float(game_input.get("away_motion_at_snap_rate", 0.22))
    home_sep = float(game_input.get("home_avg_target_separation_yds", 3.18))
    dk_start = float(game_input.get("dynamic_kickoff_avg_start_ydline", 29.8))
    dk_concussion = float(GSI_CTE_AND_HEAD_TRAUMA_PRIORS["dynamic_kickoff_concussion_reduction_pct"])

    signals = {
        "home_motion_at_snap_epa_delta": round(home_motion * 0.16, 4),
        "away_motion_at_snap_epa_delta": round(away_motion * 0.14, 4),
        "home_avg_target_separation_yds": round(home_sep, 3),
        "dynamic_kickoff_avg_start_ydline": round(dk_start, 2),
        "dynamic_kickoff_concussion_reduction_pct": dk_concussion,
    }
    return build_layer_output(
        layer_id=LAYER_ID,
        layer_slug=LAYER_SLUG,
        game_input=game_input,
        inputs=DEFAULT_INPUT_KEYS,
        source_datasets=SOURCE_DATASETS,
        freshness_rule=FRESHNESS_RULE,
        consumer=CONSUMER,
        signals=signals,
        citations=(
            "intelligence/reasoning/layers/layer_19_micro_in_game.py",
            "intelligence/coaching/core_nfl_schemes_and_systems.py",
        ),
        default_uncertainty_delta=0.002,
    )
