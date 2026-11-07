"""
layer_05_health_replacement.py — Layer 05: Injury Cluster WAR Drop-Off & OL Continuity Replacement
"""

from __future__ import annotations

from typing import Any

from ._base import build_layer_output

LAYER_ID = 5
LAYER_SLUG = "layer_05_health_replacement"
DEFAULT_INPUT_KEYS = (
    "home_ol_starters_active",
    "away_ol_starters_active",
    "home_injury_war_lost",
    "away_injury_war_lost",
)
OUTPUT_SIGNAL_KEYS = (
    "home_ol_continuity_score",
    "away_ol_continuity_score",
    "net_injury_war_advantage_home",
    "trench_cluster_degradation_flag",
)
SOURCE_DATASETS = ("nfl_official_injury_reports", "gsi_rtp_trauma_registry")
FRESHNESS_RULE = "<= 90m pre-kickoff active/inactive declaration gate"
CONSUMER = "offensive_line"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    home_ol = int(game_input.get("home_ol_starters_active", 5))
    away_ol = int(game_input.get("away_ol_starters_active", 4))
    home_war_lost = float(game_input.get("home_injury_war_lost", 0.18))
    away_war_lost = float(game_input.get("away_injury_war_lost", 0.42))

    home_ol_cont = round(max(0.2, min(1.0, home_ol / 5.0 - 0.04 * max(0, 5 - home_ol))), 4)
    away_ol_cont = round(max(0.2, min(1.0, away_ol / 5.0 - 0.04 * max(0, 5 - away_ol))), 4)
    net_war_home = round(away_war_lost - home_war_lost, 4)
    cluster_flag = bool(home_ol <= 3 or away_ol <= 3)

    signals = {
        "home_ol_continuity_score": home_ol_cont,
        "away_ol_continuity_score": away_ol_cont,
        "net_injury_war_advantage_home": net_war_home,
        "trench_cluster_degradation_flag": cluster_flag,
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
            "intelligence/reasoning/layers/layer_05_health_replacement.py",
            "intelligence/coaching/ol_provider.py",
        ),
        default_uncertainty_delta=0.004 if cluster_flag else 0.002,
    )
