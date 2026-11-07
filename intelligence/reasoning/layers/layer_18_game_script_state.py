"""
layer_18_game_script_state.py — Layer 18: Win-Probability Script State Transitions & Comeback/Kill-Clock Regimes
"""

from __future__ import annotations

from typing import Any

from ._base import build_layer_output

LAYER_ID = 18
LAYER_SLUG = "layer_18_game_script_state"
DEFAULT_INPUT_KEYS = (
    "home_lead_prob_q3",
    "home_four_minute_offense_epa",
    "away_two_minute_drill_epa",
    "blowout_tail_prob",
)
OUTPUT_SIGNAL_KEYS = (
    "home_lead_prob_q3",
    "four_minute_kill_clock_efficiency",
    "two_minute_comeback_elasticity",
    "garbage_time_pass_volume_inflation",
)
SOURCE_DATASETS = ("intelligence_coaching_situational_wp", "intelligence_coaching_drive_dire_situations")
FRESHNESS_RULE = "<= 24h game-script Markov transition tensor"
CONSUMER = "L3_structural_valuation"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    lead_q3 = float(game_input.get("home_lead_prob_q3", 0.58))
    four_min_epa = float(game_input.get("home_four_minute_offense_epa", 0.072))
    two_min_epa = float(game_input.get("away_two_minute_drill_epa", 0.048))
    blowout_prob = float(game_input.get("blowout_tail_prob", 0.21))

    signals = {
        "home_lead_prob_q3": round(lead_q3, 4),
        "four_minute_kill_clock_efficiency": round(0.55 + 1.2 * four_min_epa, 4),
        "two_minute_comeback_elasticity": round(0.50 + 1.1 * two_min_epa, 4),
        "garbage_time_pass_volume_inflation": round(blowout_prob * 6.8, 3),
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
            "intelligence/reasoning/layers/layer_18_game_script_state.py",
            "intelligence/coaching/situational_wp.py",
            "intelligence/coaching/drive_dire_situations.py",
        ),
        default_uncertainty_delta=0.002,
    )
