"""
layer_10_scheme.py — Layer 10: Core NFL Offensive & Defensive Schemes, Pass Protection & Gruden Formations
Consumes `intelligence/coaching/core_nfl_schemes_and_systems.py`:
  - 8 offensive systems (`CORE_OFFENSIVE_SCHEMES`)
  - 11 route concepts (`ROUTE_CONCEPTS_MATRIX`)
  - `2-Jet`/`3-Jet` `"One You, Two Me"` pass protection (`evaluate_pass_protection_vs_blitz`)
  - `Cover 1 Plug` / `Cover 2` / `Cover 3 Buzz` / `Cover 4 Quarters MOD/PUSH` (`evaluate_secondary_coverage_match`)
  - Gruden `S-Words` (12p) / `T-Words` (11p Trips) (`GRUDEN_AND_FOURTH_FILM_FORMATIONS`)
"""

from __future__ import annotations

from typing import Any

from intelligence.coaching.core_nfl_schemes_and_systems import (
    CORE_OFFENSIVE_SCHEMES,
    GRUDEN_AND_FOURTH_FILM_FORMATIONS,
    ROUTE_CONCEPTS_MATRIX,
    evaluate_pass_protection_vs_blitz,
    evaluate_secondary_coverage_match,
)

from ._base import build_layer_output

LAYER_ID = 10
LAYER_SLUG = "layer_10_scheme"
DEFAULT_INPUT_KEYS = (
    "home_off_scheme",
    "away_def_primary_shell",
    "home_protection_family",
    "rushers_weak_slide_side",
    "rushers_strong_man_side",
    "protection_adjustment_call",
    "primary_formation_tag",
    "primary_route_concept",
)
OUTPUT_SIGNAL_KEYS = (
    "offensive_schemes_catalog_count",
    "route_concepts_catalog_count",
    "home_scheme_id",
    "home_scheme_target_ttt_sec",
    "pass_protection_slide_rule",
    "pass_protection_overload_side",
    "pressure_disruption_prob_delta",
    "coverage_shell_rule",
    "gruden_formation_tag",
    "gruden_formation_rule",
    "s_words_count",
    "t_words_count",
)
SOURCE_DATASETS = ("core_nfl_schemes_and_systems", "fourth_and_film_formation_taxonomy")
FRESHNESS_RULE = "<= 24h coordinator tendency & film dossier sync"
CONSUMER = "coaching_scheme"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    scheme_key = str(game_input.get("home_off_scheme", "HEAVY_12_13_PERSONNEL_MODERN"))
    if scheme_key not in CORE_OFFENSIVE_SCHEMES:
        scheme_key = "HEAVY_12_13_PERSONNEL_MODERN"
    scheme_profile = CORE_OFFENSIVE_SCHEMES[scheme_key]

    shell_key = str(game_input.get("away_def_primary_shell", "COVER_4_QUARTERS"))
    prot_family = str(game_input.get("home_protection_family", "HALF_SLIDE_2_JET"))
    weak_rushers = int(game_input.get("rushers_weak_slide_side", 2))
    strong_rushers = int(game_input.get("rushers_strong_man_side", 2))
    adj_call = str(game_input.get("protection_adjustment_call", "TOM"))

    prot_eval = evaluate_pass_protection_vs_blitz(
        protection_family=prot_family,
        rushers_weak_slide_side=weak_rushers,
        rushers_strong_man_side=strong_rushers,
        adjustment_call=adj_call,
    )

    formation_tag = str(game_input.get("primary_formation_tag", "12_SNUG"))
    if formation_tag not in GRUDEN_AND_FOURTH_FILM_FORMATIONS:
        formation_tag = "12_SNUG"
    formation_info = GRUDEN_AND_FOURTH_FILM_FORMATIONS[formation_tag]

    cov_diag = evaluate_secondary_coverage_match(
        coverage_shell=shell_key,
        offensive_formation="3X1_TRIPS" if "TRIPS" in formation_tag or "TROUGH" in formation_tag else formation_tag,
        pre_snap_motion=bool(game_input.get("pre_snap_motion", True)),
        rb_release_fast_to_flat=bool(game_input.get("rb_release_fast_to_flat", True)),
        rb_release_weak_away_from_plug=bool(game_input.get("rb_release_weak_away_from_plug", True)),
        is_counter_or_gap_run=bool(game_input.get("is_counter_or_gap_run", True)),
    )

    s_words = [k for k, v in GRUDEN_AND_FOURTH_FILM_FORMATIONS.items() if v.get("family") == "S_WORD_12P"]
    t_words = [k for k, v in GRUDEN_AND_FOURTH_FILM_FORMATIONS.items() if v.get("family") == "T_WORD_TRIPS"]

    signals = {
        "offensive_schemes_catalog_count": len(CORE_OFFENSIVE_SCHEMES),
        "route_concepts_catalog_count": len(ROUTE_CONCEPTS_MATRIX),
        "home_scheme_id": scheme_profile.scheme_id,
        "home_scheme_target_ttt_sec": scheme_profile.target_time_to_throw_sec,
        "pass_protection_slide_rule": prot_eval.slide_rule,
        "pass_protection_overload_side": prot_eval.overload_side,
        "pressure_disruption_prob_delta": prot_eval.pressure_disruption_prob_delta,
        "coverage_shell_rule": cov_diag.trips_or_motion_rule,
        "gruden_formation_tag": formation_tag,
        "gruden_formation_rule": formation_info["rule"],
        "s_words_count": len(s_words),
        "t_words_count": len(t_words),
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
            "intelligence/reasoning/layers/layer_10_scheme.py",
        ),
        default_uncertainty_delta=0.0015,
    )
