"""
layer_04_schedule_situations.py — Layer 04: Rest Disparity, Short Week, Travel & Circadian Load
"""

from __future__ import annotations

from typing import Any

from ._base import build_layer_output

LAYER_ID = 4
LAYER_SLUG = "layer_04_schedule_situations"
DEFAULT_INPUT_KEYS = ("home_rest_days", "away_rest_days", "away_timezone_shift_hours", "is_divisional")
OUTPUT_SIGNAL_KEYS = (
    "net_rest_days_home_minus_away",
    "rest_spread_adjustment_pts",
    "circadian_fourth_quarter_drag",
    "divisional_familiarity_total_dampener",
)
SOURCE_DATASETS = ("nflverse_schedules", "intelligence_coaching_rest_days")
FRESHNESS_RULE = "<= 7d static schedule + flex kickoff confirmation"
CONSUMER = "L2_interaction_synthesis"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    home_rest = int(game_input.get("home_rest_days", 7))
    away_rest = int(game_input.get("away_rest_days", 7))
    tz_shift = float(game_input.get("away_timezone_shift_hours", 0.0))
    is_divisional = bool(game_input.get("is_divisional", False))

    net_rest = home_rest - away_rest
    rest_spread_adj = round(0.22 * net_rest + 0.14 * abs(tz_shift), 3)
    circadian_drag = round(0.015 * abs(tz_shift) + (0.035 if away_rest <= 4 else 0.0), 4)
    div_dampener = -1.15 if is_divisional else 0.0

    signals = {
        "net_rest_days_home_minus_away": net_rest,
        "rest_spread_adjustment_pts": rest_spread_adj,
        "circadian_fourth_quarter_drag": circadian_drag,
        "divisional_familiarity_total_dampener": div_dampener,
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
            "intelligence/reasoning/layers/layer_04_schedule_situations.py",
            "intelligence/coaching/rest_days.py",
        ),
        default_uncertainty_delta=0.0015,
    )
