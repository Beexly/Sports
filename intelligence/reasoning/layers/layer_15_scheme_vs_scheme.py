"""
layer_15_scheme_vs_scheme.py — Layer 15: Structural Scheme vs Scheme Beaters
Consumes `intelligence/coaching/core_nfl_schemes_and_systems.py`:
  - `Quarters` vs `MILLS` (`POST_DIG_HIGH_LOW`) / `DAGGER`
  - `Cover 1 Plug` `Rat` / `Banjo` vs `MESH`
  - Offensive system EPA boost vs defensive coverage shell
"""

from __future__ import annotations

from typing import Any

from intelligence.coaching.core_nfl_schemes_and_systems import (
    CORE_OFFENSIVE_SCHEMES,
    ROUTE_CONCEPTS_MATRIX,
    evaluate_secondary_coverage_match,
)

from ._base import build_layer_output

LAYER_ID = 15
LAYER_SLUG = "layer_15_scheme_vs_scheme"
DEFAULT_INPUT_KEYS = (
    "home_off_scheme",
    "away_def_primary_shell",
    "away_off_scheme",
    "home_def_primary_shell",
)
OUTPUT_SIGNAL_KEYS = (
    "home_scheme_vs_away_shell_epa_boost",
    "away_scheme_vs_home_shell_epa_boost",
    "quarters_mills_post_dig_epa_unmatched",
    "cover1_plug_rat_banjo_rule",
    "net_scheme_interaction_epa_home",
)
SOURCE_DATASETS = ("core_nfl_schemes_and_systems",)
FRESHNESS_RULE = "<= 24h structural scheme interaction matrix"
CONSUMER = "scheme_matchup"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    home_scheme_id = str(game_input.get("home_off_scheme", "HEAVY_12_13_PERSONNEL_MODERN"))
    away_shell = str(game_input.get("away_def_primary_shell", "COVER_4_QUARTERS"))
    away_scheme_id = str(game_input.get("away_off_scheme", "WEST_COAST"))
    home_shell = str(game_input.get("home_def_primary_shell", "COVER_3"))

    home_scheme = CORE_OFFENSIVE_SCHEMES.get(home_scheme_id, CORE_OFFENSIVE_SCHEMES["HEAVY_12_13_PERSONNEL_MODERN"])
    away_scheme = CORE_OFFENSIVE_SCHEMES.get(away_scheme_id, CORE_OFFENSIVE_SCHEMES["WEST_COAST"])

    home_boost = float(home_scheme.epa_boost_vs_shell.get(away_shell, 0.025))
    away_boost = float(away_scheme.epa_boost_vs_shell.get(home_shell, 0.018))

    mills_rule = ROUTE_CONCEPTS_MATRIX["MILLS"]
    plug_diag = evaluate_secondary_coverage_match(
        coverage_shell="COVER_1_PLUG",
        offensive_formation="11_TRIPS",
        pre_snap_motion=True,
        rb_release_weak_away_from_plug=True,
    )

    signals = {
        "home_scheme_vs_away_shell_epa_boost": round(home_boost, 4),
        "away_scheme_vs_home_shell_epa_boost": round(away_boost, 4),
        "quarters_mills_post_dig_epa_unmatched": mills_rule.epa_delta_when_unmatched,
        "cover1_plug_rat_banjo_rule": f"{plug_diag.trips_or_motion_rule} | {plug_diag.rb_release_rule}",
        "net_scheme_interaction_epa_home": round(home_boost - away_boost, 4),
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
            "intelligence/coaching/core_nfl_schemes_and_systems.py",
            "intelligence/reasoning/layers/layer_15_scheme_vs_scheme.py",
        ),
        default_uncertainty_delta=0.0015,
    )
