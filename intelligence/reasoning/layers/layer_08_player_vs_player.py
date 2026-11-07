"""
layer_08_player_vs_player.py — Layer 08: WR/CB Shadow Matchup & Edge Rusher vs OT One-on-One Win Rate
"""

from __future__ import annotations

from typing import Any

from ._base import build_layer_output

LAYER_ID = 8
LAYER_SLUG = "layer_08_player_vs_player"
DEFAULT_INPUT_KEYS = (
    "home_edge1_pass_rush_win_rate",
    "away_lt_pass_block_win_rate",
    "away_edge1_pass_rush_win_rate",
    "home_lt_pass_block_win_rate",
    "wr1_vs_cb1_separation_delta",
)
OUTPUT_SIGNAL_KEYS = (
    "home_edge_vs_away_lt_mismatch",
    "away_edge_vs_home_lt_mismatch",
    "wr1_cb1_separation_yards_delta",
    "isolated_boundary_win_prob",
)
SOURCE_DATASETS = ("nflverse_nextgen_stats_receiving", "gse_trench_pocket_physics")
FRESHNESS_RULE = "<= 48h weekly alignment & shadow cornerback projection"
CONSUMER = "offensive_line"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    home_prwr = float(game_input.get("home_edge1_pass_rush_win_rate", 0.215))
    away_pbwr = float(game_input.get("away_lt_pass_block_win_rate", 0.895))
    away_prwr = float(game_input.get("away_edge1_pass_rush_win_rate", 0.185))
    home_pbwr = float(game_input.get("home_lt_pass_block_win_rate", 0.928))
    sep_delta = float(game_input.get("wr1_vs_cb1_separation_delta", 0.42))

    home_edge_mismatch = round(home_prwr - (1.0 - away_pbwr), 4)
    away_edge_mismatch = round(away_prwr - (1.0 - home_pbwr), 4)
    iso_win_prob = round(min(0.85, max(0.25, 0.52 + 0.18 * sep_delta)), 4)

    signals = {
        "home_edge_vs_away_lt_mismatch": home_edge_mismatch,
        "away_edge_vs_home_lt_mismatch": away_edge_mismatch,
        "wr1_cb1_separation_yards_delta": round(sep_delta, 3),
        "isolated_boundary_win_prob": iso_win_prob,
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
            "intelligence/reasoning/layers/layer_08_player_vs_player.py",
            "intelligence/coaching/trench_pocket_physics.py",
        ),
        default_uncertainty_delta=0.002,
    )
