"""
layer_07_player_traits_form.py — Layer 07: QB Time-to-Throw, Pressure-to-Sack & Skill Separation Form
"""

from __future__ import annotations

from typing import Any

from ._base import build_layer_output

LAYER_ID = 7
LAYER_SLUG = "layer_07_player_traits_form"
DEFAULT_INPUT_KEYS = (
    "home_qb_ttt_sec",
    "away_qb_ttt_sec",
    "home_qb_p2s_rate",
    "away_qb_p2s_rate",
    "home_qb_cpoe_ewma",
    "away_qb_cpoe_ewma",
)
OUTPUT_SIGNAL_KEYS = (
    "home_qb_ttt_sec",
    "away_qb_ttt_sec",
    "net_qb_sack_avoidance_edge_home",
    "net_qb_cpoe_form_delta_home",
)
SOURCE_DATASETS = ("nflverse_nextgen_stats_passing", "gse_qb_visual_cognitive_load")
FRESHNESS_RULE = "<= 48h rolling 4-week exponentially weighted form"
CONSUMER = "qb_behavior"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    home_ttt = float(game_input.get("home_qb_ttt_sec", 2.82))
    away_ttt = float(game_input.get("away_qb_ttt_sec", 2.59))
    home_p2s = float(game_input.get("home_qb_p2s_rate", 0.152))
    away_p2s = float(game_input.get("away_qb_p2s_rate", 0.194))
    home_cpoe = float(game_input.get("home_qb_cpoe_ewma", 3.4))
    away_cpoe = float(game_input.get("away_qb_cpoe_ewma", 0.8))

    signals = {
        "home_qb_ttt_sec": round(home_ttt, 3),
        "away_qb_ttt_sec": round(away_ttt, 3),
        "net_qb_sack_avoidance_edge_home": round(away_p2s - home_p2s, 4),
        "net_qb_cpoe_form_delta_home": round(home_cpoe - away_cpoe, 3),
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
            "intelligence/reasoning/layers/layer_07_player_traits_form.py",
            "intelligence/coaching/qb_visual_cognitive_load.py",
        ),
        default_uncertainty_delta=0.002,
    )
