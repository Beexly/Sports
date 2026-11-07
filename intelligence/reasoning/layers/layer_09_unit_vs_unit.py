"""
layer_09_unit_vs_unit.py — Layer 09: OL Unit vs DL Front Seven Trench Physics & Stuff Rate
"""

from __future__ import annotations

from typing import Any

from ._base import build_layer_output

LAYER_ID = 9
LAYER_SLUG = "layer_09_unit_vs_unit"
DEFAULT_INPUT_KEYS = (
    "home_ol_ybc_per_rush",
    "away_dl_stuff_rate",
    "away_ol_ybc_per_rush",
    "home_dl_stuff_rate",
    "home_ol_pocket_time_sec",
    "away_ol_pocket_time_sec",
)
OUTPUT_SIGNAL_KEYS = (
    "home_trench_run_push_index",
    "away_trench_run_push_index",
    "net_pocket_integrity_sec_home",
    "ol_unit_dominance_edge_home",
)
SOURCE_DATASETS = ("gse_trench_pocket_physics", "nflverse_pbp_2026_rushing")
FRESHNESS_RULE = "<= 24h post-injury OL 5-man unit combination projection"
CONSUMER = "offensive_line"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    home_ybc = float(game_input.get("home_ol_ybc_per_rush", 1.54))
    away_stuff = float(game_input.get("away_dl_stuff_rate", 0.175))
    away_ybc = float(game_input.get("away_ol_ybc_per_rush", 1.18))
    home_stuff = float(game_input.get("home_dl_stuff_rate", 0.212))
    home_pocket = float(game_input.get("home_ol_pocket_time_sec", 2.68))
    away_pocket = float(game_input.get("away_ol_pocket_time_sec", 2.41))

    home_push = round(home_ybc * (1.0 - away_stuff), 4)
    away_push = round(away_ybc * (1.0 - home_stuff), 4)
    net_pocket = round(home_pocket - away_pocket, 3)
    ol_dom_edge = round((home_push - away_push) + 0.65 * net_pocket, 4)

    signals = {
        "home_trench_run_push_index": home_push,
        "away_trench_run_push_index": away_push,
        "net_pocket_integrity_sec_home": net_pocket,
        "ol_unit_dominance_edge_home": ol_dom_edge,
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
            "intelligence/reasoning/layers/layer_09_unit_vs_unit.py",
            "intelligence/coaching/trench_pocket_physics.py",
        ),
        default_uncertainty_delta=0.002,
    )
