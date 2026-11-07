"""
layer_11_coach_mind.py — Layer 11: Coach Mind, PROE+, Opening 15 Script, 4th-Down & Clock Tendencies
Consumes `intelligence/coaching/core_nfl_schemes_and_systems.py`.
"""

from __future__ import annotations

from typing import Any

from intelligence.coaching.core_nfl_schemes_and_systems import (
    CORE_OFFENSIVE_SCHEMES,
    GSI_CTE_AND_HEAD_TRAUMA_PRIORS,
    lookup_down_and_distance_prior,
)

from ._base import build_layer_output

LAYER_ID = 11
LAYER_SLUG = "layer_11_coach_mind"
DEFAULT_INPUT_KEYS = (
    "home_proe_neutral",
    "away_proe_neutral",
    "home_opening15_epa_per_play",
    "home_fourth_down_go_over_expected",
    "scripted_third_down_ydstogo",
)
OUTPUT_SIGNAL_KEYS = (
    "home_proe_neutral",
    "away_proe_neutral",
    "home_opening15_epa_per_play",
    "fourth_down_aggressiveness_delta",
    "third_down_immediate_conversion_prior",
    "fourth_and_short_conversion_prior",
    "referee_sub_window_sec",
)
SOURCE_DATASETS = ("core_nfl_schemes_and_systems", "intelligence_coaching_proe", "intelligence_coaching_coach_risk")
FRESHNESS_RULE = "<= 24h rolling play-caller tenure & PROE+ update"
CONSUMER = "coaching_scheme"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    home_proe = float(game_input.get("home_proe_neutral", 0.038))
    away_proe = float(game_input.get("away_proe_neutral", -0.012))
    open15_epa = float(game_input.get("home_opening15_epa_per_play", 0.145))
    fourth_go_oe = float(game_input.get("home_fourth_down_go_over_expected", 0.082))
    third_ydstogo = float(game_input.get("scripted_third_down_ydstogo", 4.5))

    third_prior = lookup_down_and_distance_prior(3, third_ydstogo)
    fourth_short_prior = lookup_down_and_distance_prior(4, 2.0)
    scheme_key = str(game_input.get("home_off_scheme", "HEAVY_12_13_PERSONNEL_MODERN"))
    scheme = CORE_OFFENSIVE_SCHEMES.get(scheme_key, CORE_OFFENSIVE_SCHEMES["HEAVY_12_13_PERSONNEL_MODERN"])
    sub_win = GSI_CTE_AND_HEAD_TRAUMA_PRIORS["referee_substitution_matching_window_sec"]

    signals = {
        "home_proe_neutral": round(home_proe, 4),
        "away_proe_neutral": round(away_proe, 4),
        "home_opening15_epa_per_play": round(open15_epa, 4),
        "fourth_down_aggressiveness_delta": round(fourth_go_oe, 4),
        "third_down_immediate_conversion_prior": third_prior.immediate_conversion_prob,
        "fourth_and_short_conversion_prior": fourth_short_prior.immediate_conversion_prob,
        "scheme_originator_anchor": scheme.originators_and_practitioners[0],
        "referee_sub_window_sec": list(sub_win),
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
            "intelligence/coaching/proe.py",
            "intelligence/coaching/coach_risk.py",
        ),
        default_uncertainty_delta=0.002,
    )
