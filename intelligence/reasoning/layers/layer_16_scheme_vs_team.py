"""
layer_16_scheme_vs_team.py — Layer 16: 60-Minute Personnel Execution Capacity & No-Sub Tempo Trap
Consumes `intelligence/coaching/core_nfl_schemes_and_systems.py`.
"""

from __future__ import annotations

from typing import Any

from intelligence.coaching.core_nfl_schemes_and_systems import (
    CORE_OFFENSIVE_SCHEMES,
    GRUDEN_AND_FOURTH_FILM_FORMATIONS,
    GSI_CTE_AND_HEAD_TRAUMA_PRIORS,
)

from ._base import build_layer_output

LAYER_ID = 16
LAYER_SLUG = "layer_16_scheme_vs_team"
DEFAULT_INPUT_KEYS = (
    "home_12p_rate",
    "away_big_nickel_match_grade",
    "away_def_4q_snap_fatigue_threshold",
    "home_no_sub_tempo_rate",
)
OUTPUT_SIGNAL_KEYS = (
    "sixty_minute_execution_capacity_home",
    "no_sub_tempo_trap_epa_boost",
    "under_center_3step_timing_edge_sec",
    "condensed_12_snug_formation_rule",
)
SOURCE_DATASETS = ("core_nfl_schemes_and_systems", "nflverse_personnel_grouping_rates")
FRESHNESS_RULE = "<= 48h 60-minute personnel & defensive sub-package endurance audit"
CONSUMER = "scheme_matchup"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    home_12p = float(game_input.get("home_12p_rate", 0.51))
    big_nickel_grade = float(game_input.get("away_big_nickel_match_grade", 0.66))
    no_sub_rate = float(game_input.get("home_no_sub_tempo_rate", 0.24))

    heavy_scheme = CORE_OFFENSIVE_SCHEMES["HEAVY_12_13_PERSONNEL_MODERN"]
    snug_rule = GRUDEN_AND_FOURTH_FILM_FORMATIONS["12_SNUG"]["rule"]
    uc_timing = float(GSI_CTE_AND_HEAD_TRAUMA_PRIORS["under_center_3step_flat_timing_advantage_sec"])

    exec_cap = round(0.55 + 0.45 * home_12p * (1.15 - big_nickel_grade), 4)
    tempo_trap_boost = round(no_sub_rate * 0.14, 4)

    signals = {
        "sixty_minute_execution_capacity_home": exec_cap,
        "no_sub_tempo_trap_epa_boost": tempo_trap_boost,
        "under_center_3step_timing_edge_sec": uc_timing,
        "condensed_12_snug_formation_rule": snug_rule,
        "heavy_12_13_target_ttt_sec": heavy_scheme.target_time_to_throw_sec,
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
            "intelligence/reasoning/layers/layer_16_scheme_vs_team.py",
        ),
        default_uncertainty_delta=0.002,
    )
