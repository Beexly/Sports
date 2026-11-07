"""
layer_20_outside_game_human_signals.py — Layer 20: Beat Reporter Practice Tone, Locker Room & Coach-Speak Probe
"""

from __future__ import annotations

from typing import Any

from ._base import build_layer_output

LAYER_ID = 20
LAYER_SLUG = "layer_20_outside_game_human_signals"
DEFAULT_INPUT_KEYS = (
    "coach_speak_deflection_index",
    "beat_reporter_injury_optimism_z",
    "contract_incentive_active",
)
OUTPUT_SIGNAL_KEYS = (
    "coach_speak_deflection_index",
    "beat_reporter_injury_optimism_z",
    "hidden_snap_count_limit_risk",
    "human_motivation_reliability_weight",
)
SOURCE_DATASETS = ("intelligence_coaching_coach_speak_probe", "gse_beat_reporter_verified_feeds")
FRESHNESS_RULE = "<= 12h Friday/Saturday podium transcript & beat check"
CONSUMER = "trust_signals"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    deflection = float(game_input.get("coach_speak_deflection_index", 0.24))
    beat_opt = float(game_input.get("beat_reporter_injury_optimism_z", 0.35))
    incentive = bool(game_input.get("contract_incentive_active", False))

    snap_limit_risk = round(max(0.0, min(1.0, 0.55 * deflection - 0.15 * beat_opt)), 4)

    signals = {
        "coach_speak_deflection_index": round(deflection, 4),
        "beat_reporter_injury_optimism_z": round(beat_opt, 4),
        "hidden_snap_count_limit_risk": snap_limit_risk,
        "human_motivation_reliability_weight": 0.18 if incentive else 0.10,
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
            "intelligence/reasoning/layers/layer_20_outside_game_human_signals.py",
            "intelligence/coaching/coach_speak_emotional_deflection_probe.py",
        ),
        default_uncertainty_delta=0.003,
    )
