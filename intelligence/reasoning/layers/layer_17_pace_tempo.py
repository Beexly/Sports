"""
layer_17_pace_tempo.py — Layer 17: Neutral Pace, Hurry-Up Seconds/Snap & Total Plays Projection
"""

from __future__ import annotations

from typing import Any

from ._base import build_layer_output

LAYER_ID = 17
LAYER_SLUG = "layer_17_pace_tempo"
DEFAULT_INPUT_KEYS = (
    "home_neutral_sec_per_snap",
    "away_neutral_sec_per_snap",
    "home_trailing_hurry_up_sec",
    "away_trailing_hurry_up_sec",
)
OUTPUT_SIGNAL_KEYS = (
    "combined_neutral_sec_per_snap",
    "projected_combined_plays",
    "pace_total_points_adjustment",
)
SOURCE_DATASETS = ("intelligence_coaching_tempo", "nflverse_pbp_2026")
FRESHNESS_RULE = "<= 24h situation-neutral pace & clock runoff audit"
CONSUMER = "L3_structural_valuation"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    home_sec = float(game_input.get("home_neutral_sec_per_snap", 27.4))
    away_sec = float(game_input.get("away_neutral_sec_per_snap", 26.8))

    combined_sec = round(0.5 * (home_sec + away_sec), 3)
    projected_plays = round(126.0 + (27.5 - combined_sec) * 3.8, 2)
    pace_total_adj = round((projected_plays - 126.0) * 0.34, 3)

    signals = {
        "combined_neutral_sec_per_snap": combined_sec,
        "projected_combined_plays": projected_plays,
        "pace_total_points_adjustment": pace_total_adj,
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
            "intelligence/reasoning/layers/layer_17_pace_tempo.py",
            "intelligence/coaching/tempo.py",
        ),
        default_uncertainty_delta=0.0015,
    )
