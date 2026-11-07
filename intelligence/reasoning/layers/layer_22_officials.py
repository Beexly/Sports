"""
layer_22_officials.py — Layer 22: Referee Crew Offensive Holding, DPI & Pace Stoppage Priors
"""

from __future__ import annotations

from typing import Any

from ._base import build_layer_output

LAYER_ID = 22
LAYER_SLUG = "layer_22_officials"
DEFAULT_INPUT_KEYS = (
    "referee_crew_id",
    "crew_offensive_holding_z",
    "crew_dpi_rate_z",
    "crew_home_penalty_bias_yds",
)
OUTPUT_SIGNAL_KEYS = (
    "referee_crew_id",
    "offensive_holding_drive_kill_delta",
    "dpi_explosive_extension_delta",
    "referee_total_points_delta",
)
SOURCE_DATASETS = ("nfl_officiating_crew_assignments_2026",)
FRESHNESS_RULE = "<= 72h Wednesday NFL officiating crew assignment release"
CONSUMER = "L2_interaction_synthesis"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    crew_id = str(game_input.get("referee_crew_id", "CREW_CHEFERS_2026"))
    holding_z = float(game_input.get("crew_offensive_holding_z", 0.35))
    dpi_z = float(game_input.get("crew_dpi_rate_z", 0.20))

    holding_delta = round(-0.42 * holding_z, 4)
    dpi_delta = round(0.55 * dpi_z, 4)
    total_delta = round(holding_delta + dpi_delta, 4)

    signals = {
        "referee_crew_id": crew_id,
        "offensive_holding_drive_kill_delta": holding_delta,
        "dpi_explosive_extension_delta": dpi_delta,
        "referee_total_points_delta": total_delta,
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
            "intelligence/reasoning/layers/layer_22_officials.py",
            "packages/prediction-engine/src/signals/",
        ),
        default_uncertainty_delta=0.0015,
    )
