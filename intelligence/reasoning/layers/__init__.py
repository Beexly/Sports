"""
intelligence/reasoning/layers/__init__.py — Exports `ALL_26_LAYERS` and `run_all_26_layers(game_input)`.
"""

from __future__ import annotations

from types import ModuleType
from typing import Any

from . import (
    layer_01_freshness_reality,
    layer_02_totals_baselines,
    layer_03_venue_physical_environment,
    layer_04_schedule_situations,
    layer_05_health_replacement,
    layer_06_roster_usage,
    layer_07_player_traits_form,
    layer_08_player_vs_player,
    layer_09_unit_vs_unit,
    layer_10_scheme,
    layer_11_coach_mind,
    layer_12_coach_vs_coach,
    layer_13_coach_vs_player,
    layer_14_player_vs_scheme,
    layer_15_scheme_vs_scheme,
    layer_16_scheme_vs_team,
    layer_17_pace_tempo,
    layer_18_game_script_state,
    layer_19_micro_in_game,
    layer_20_outside_game_human_signals,
    layer_21_history,
    layer_22_officials,
    layer_23_market,
    layer_24_gsi_cross_domain_methods,
    layer_25_missingness_contradiction,
    layer_26_adversary_synthesis,
)

ALL_26_LAYERS: tuple[ModuleType, ...] = (
    layer_01_freshness_reality,
    layer_02_totals_baselines,
    layer_03_venue_physical_environment,
    layer_04_schedule_situations,
    layer_05_health_replacement,
    layer_06_roster_usage,
    layer_07_player_traits_form,
    layer_08_player_vs_player,
    layer_09_unit_vs_unit,
    layer_10_scheme,
    layer_11_coach_mind,
    layer_12_coach_vs_coach,
    layer_13_coach_vs_player,
    layer_14_player_vs_scheme,
    layer_15_scheme_vs_scheme,
    layer_16_scheme_vs_team,
    layer_17_pace_tempo,
    layer_18_game_script_state,
    layer_19_micro_in_game,
    layer_20_outside_game_human_signals,
    layer_21_history,
    layer_22_officials,
    layer_23_market,
    layer_24_gsi_cross_domain_methods,
    layer_25_missingness_contradiction,
    layer_26_adversary_synthesis,
)


def run_all_26_layers(game_input: dict[str, Any]) -> list[dict[str, Any]]:
    """Execute all 26 reasoning layers in strict 1..26 order and return validated layer outputs."""
    outputs: list[dict[str, Any]] = []
    for mod in ALL_26_LAYERS:
        layer_out = mod.run_layer(game_input)
        outputs.append(layer_out)
    return outputs


__all__ = [
    "ALL_26_LAYERS",
    "run_all_26_layers",
]
