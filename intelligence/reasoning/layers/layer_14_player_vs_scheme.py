"""
layer_14_player_vs_scheme.py — Layer 14: Player vs Coverage Shell & Box Count Splits
Consumes `intelligence/coaching/core_nfl_schemes_and_systems.py`.
"""

from __future__ import annotations

from typing import Any

from intelligence.coaching.core_nfl_schemes_and_systems import (
    ROUTE_CONCEPTS_MATRIX,
    evaluate_secondary_coverage_match,
)

from ._base import build_layer_output

LAYER_ID = 14
LAYER_SLUG = "layer_14_player_vs_scheme"
DEFAULT_INPUT_KEYS = (
    "away_def_primary_shell",
    "qb_yprr_delta_vs_shell",
    "rb_epa_vs_light_box",
    "light_box_rate_faced",
    "primary_route_concept",
)
OUTPUT_SIGNAL_KEYS = (
    "target_coverage_shell",
    "qb_epa_split_vs_shell",
    "rb_counter_run_epa_vs_two_high",
    "route_concept_beater_active",
    "rb_release_match_rule",
)
SOURCE_DATASETS = ("core_nfl_schemes_and_systems", "nflverse_coverage_shell_splits")
FRESHNESS_RULE = "<= 48h player vs coverage shell & box-count split matrix"
CONSUMER = "qb_behavior"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    shell = str(game_input.get("away_def_primary_shell", "COVER_4_QUARTERS")).upper()
    qb_delta = float(game_input.get("qb_yprr_delta_vs_shell", 0.055))
    light_box_rate = float(game_input.get("light_box_rate_faced", 0.64))
    concept_key = str(game_input.get("primary_route_concept", "DAGGER")).upper()
    if concept_key not in ROUTE_CONCEPTS_MATRIX:
        concept_key = "DAGGER"

    concept = ROUTE_CONCEPTS_MATRIX[concept_key]
    diag = evaluate_secondary_coverage_match(
        coverage_shell=shell,
        offensive_formation="3X1_TRIPS",
        pre_snap_motion=True,
        rb_release_fast_to_flat=True,
        rb_release_weak_away_from_plug=True,
        is_counter_or_gap_run=True,
    )
    beater_active = any(shell.startswith(b) or b in shell for b in concept.target_coverages_beaten)
    rb_counter_epa = round(diag.counter_run_vulnerability_epa_delta * light_box_rate, 4)

    signals = {
        "target_coverage_shell": shell,
        "qb_epa_split_vs_shell": round(qb_delta + (concept.epa_delta_when_unmatched if beater_active else concept.epa_delta_when_matched), 4),
        "rb_counter_run_epa_vs_two_high": rb_counter_epa,
        "route_concept_beater_active": beater_active,
        "rb_release_match_rule": diag.rb_release_rule,
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
            "intelligence/reasoning/layers/layer_14_player_vs_scheme.py",
        ),
        default_uncertainty_delta=0.002,
    )
