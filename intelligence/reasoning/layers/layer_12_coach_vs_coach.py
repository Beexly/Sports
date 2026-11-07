"""
layer_12_coach_vs_coach.py — Layer 12: Play-Caller vs Defensive Coordinator Chess Match & Halftime Elasticity
"""

from __future__ import annotations

from typing import Any

from ._base import build_layer_output

LAYER_ID = 12
LAYER_SLUG = "layer_12_coach_vs_coach"
DEFAULT_INPUT_KEYS = (
    "home_hc_2h_adjustment_epa",
    "away_dc_disguise_rate",
    "coaching_tree_familiarity",
    "script_elasticity_delta",
)
OUTPUT_SIGNAL_KEYS = (
    "net_2h_adjustment_epa_home",
    "away_dc_pre_post_snap_disguise_rate",
    "coaching_tree_familiarity_flag",
    "halftime_script_elasticity_score",
)
SOURCE_DATASETS = ("intelligence_coaching_adjustments", "intelligence_coaching_script_elasticity")
FRESHNESS_RULE = "<= 7d coaching staff matchup & tree familiarity index"
CONSUMER = "coaching_scheme"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    home_2h_epa = float(game_input.get("home_hc_2h_adjustment_epa", 0.064))
    away_disguise = float(game_input.get("away_dc_disguise_rate", 0.345))
    tree_fam = bool(game_input.get("coaching_tree_familiarity", True))
    elasticity = float(game_input.get("script_elasticity_delta", 0.052))

    signals = {
        "net_2h_adjustment_epa_home": round(home_2h_epa - 0.08 * (away_disguise - 0.30), 4),
        "away_dc_pre_post_snap_disguise_rate": round(away_disguise, 4),
        "coaching_tree_familiarity_flag": tree_fam,
        "halftime_script_elasticity_score": round(elasticity, 4),
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
            "intelligence/reasoning/layers/layer_12_coach_vs_coach.py",
            "intelligence/coaching/adjustments.py",
            "intelligence/coaching/script_elasticity.py",
        ),
        default_uncertainty_delta=0.002,
    )
