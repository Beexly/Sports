"""
layer_06_roster_usage.py — Layer 06: Snap Share, Route Participation, Target Share & Active player_gp Denominator
"""

from __future__ import annotations

from typing import Any

from ._base import build_layer_output

LAYER_ID = 6
LAYER_SLUG = "layer_06_roster_usage"
DEFAULT_INPUT_KEYS = (
    "home_wr1_target_share",
    "away_wr1_target_share",
    "home_rb1_opportunity_share",
    "strict_player_gp_denominator",
)
OUTPUT_SIGNAL_KEYS = (
    "home_target_concentration_hhi",
    "away_target_concentration_hhi",
    "home_rb1_weighted_opportunities",
    "strict_player_gp_denominator_enforced",
)
SOURCE_DATASETS = ("nflverse_snap_counts_2026", "nflverse_player_stats_active_gp")
FRESHNESS_RULE = "<= 24h post-practice participation & depth chart lock"
CONSUMER = "L1_signal_extraction"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    home_wr1_ts = float(game_input.get("home_wr1_target_share", 0.275))
    away_wr1_ts = float(game_input.get("away_wr1_target_share", 0.245))
    home_rb1_opp = float(game_input.get("home_rb1_opportunity_share", 0.68))
    strict_gp = bool(game_input.get("strict_player_gp_denominator", True))

    home_hhi = round(home_wr1_ts**2 + 0.14, 4)
    away_hhi = round(away_wr1_ts**2 + 0.13, 4)
    rb1_weighted_opp = round(26.5 * home_rb1_opp, 2)

    signals = {
        "home_target_concentration_hhi": home_hhi,
        "away_target_concentration_hhi": away_hhi,
        "home_rb1_weighted_opportunities": rb1_weighted_opp,
        "strict_player_gp_denominator_enforced": strict_gp,
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
            "intelligence/reasoning/layers/layer_06_roster_usage.py",
            "packages/prediction-engine/src/player-rate-posteriors.ts",
        ),
        default_uncertainty_delta=0.002,
    )
