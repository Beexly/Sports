"""
layer_03_venue_physical_environment.py — Layer 03: Venue, Weather, Wind, Turf & Altitude Physics
"""

from __future__ import annotations

from typing import Any

from ._base import build_layer_output

LAYER_ID = 3
LAYER_SLUG = "layer_03_venue_physical_environment"
DEFAULT_INPUT_KEYS = ("is_dome", "wind_mph", "temp_f", "precip_prob", "surface_type", "altitude_ft")
OUTPUT_SIGNAL_KEYS = (
    "weather_total_delta_pts",
    "deep_pass_completion_penalty",
    "fg_make_prob_50plus_delta",
    "surface_speed_multiplier",
)
SOURCE_DATASETS = ("open_meteo_hourly_forecast", "nfl_stadium_geometry_registry")
FRESHNESS_RULE = "<= 3h pre-kickoff synoptic + mesoscale wind update"
CONSUMER = "L3_structural_valuation"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    is_dome = bool(game_input.get("is_dome", False))
    wind_mph = 0.0 if is_dome else float(game_input.get("wind_mph", 9.5))
    temp_f = 70.0 if is_dome else float(game_input.get("temp_f", 56.0))
    precip_prob = 0.0 if is_dome else float(game_input.get("precip_prob", 0.10))
    surface = str(game_input.get("surface_type", "grass")).lower()
    altitude_ft = float(game_input.get("altitude_ft", 120.0))

    wind_excess = max(0.0, wind_mph - 12.0)
    weather_total_delta = round(-0.28 * wind_excess - 1.45 * precip_prob - (0.04 * max(0.0, 40.0 - temp_f)), 3)
    deep_pass_penalty = round(-0.008 * wind_excess - 0.035 * precip_prob, 4)
    fg_delta = round(-0.012 * wind_excess + 0.000012 * altitude_ft, 4)
    surface_mult = 1.022 if "turf" in surface or is_dome else 1.000

    signals = {
        "weather_total_delta_pts": weather_total_delta,
        "deep_pass_completion_penalty": deep_pass_penalty,
        "fg_make_prob_50plus_delta": fg_delta,
        "surface_speed_multiplier": surface_mult,
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
            "intelligence/reasoning/layers/layer_03_venue_physical_environment.py",
            "packages/prediction-engine/src/weather/",
        ),
        default_uncertainty_delta=0.0025 if not is_dome else 0.001,
    )
