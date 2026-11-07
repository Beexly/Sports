"""
layer_02_totals_baselines.py — Layer 02: League & Era Scoring Totals Baselines
"""

from __future__ import annotations

from typing import Any

from ._base import build_layer_output

LAYER_ID = 2
LAYER_SLUG = "layer_02_totals_baselines"
DEFAULT_INPUT_KEYS = ("league_mean_total", "home_off_epa_baseline", "away_off_epa_baseline", "dynamic_kickoff_return_rate")
OUTPUT_SIGNAL_KEYS = (
    "structural_total_baseline",
    "structural_spread_home_margin",
    "dynamic_kickoff_drive_start_ydline",
    "scoring_environment_z",
)
SOURCE_DATASETS = ("nflverse_pbp_2026", "nflverse_team_epa_baselines")
FRESHNESS_RULE = "<= 24h weekly rolling Tuesday post-MNF recalibration"
CONSUMER = "L3_structural_valuation"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    league_mean_total = float(game_input.get("league_mean_total", 44.6))
    home_epa = float(game_input.get("home_off_epa_baseline", 0.068))
    away_epa = float(game_input.get("away_off_epa_baseline", -0.015))
    home_def_epa = float(game_input.get("home_def_epa_baseline", -0.032))
    away_def_epa = float(game_input.get("away_def_epa_baseline", 0.024))
    dk_return_rate = float(game_input.get("dynamic_kickoff_return_rate", 0.34))

    drive_start = round(29.2 + 2.4 * dk_return_rate, 2)
    structural_total = round(
        league_mean_total + 28.0 * (home_epa + away_epa + home_def_epa + away_def_epa) + 0.15 * (drive_start - 29.5),
        3,
    )
    home_margin = round(2.1 + 32.0 * ((home_epa - away_def_epa) - (away_epa - home_def_epa)), 3)
    env_z = round((structural_total - 44.5) / 6.5, 4)

    signals = {
        "structural_total_baseline": structural_total,
        "structural_spread_home_margin": home_margin,
        "dynamic_kickoff_drive_start_ydline": drive_start,
        "scoring_environment_z": env_z,
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
            "intelligence/reasoning/layers/layer_02_totals_baselines.py",
            "packages/prediction-engine/src/tweedie-baseline.ts",
        ),
        default_uncertainty_delta=0.002,
    )
