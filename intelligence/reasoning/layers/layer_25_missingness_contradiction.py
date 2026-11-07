"""
layer_25_missingness_contradiction.py — Layer 25: Cross-Layer Missingness & Signal Contradiction Detector
"""

from __future__ import annotations

from typing import Any

from ._base import build_layer_output

LAYER_ID = 25
LAYER_SLUG = "layer_25_missingness_contradiction"
DEFAULT_INPUT_KEYS = (
    "waived_layers",
    "missing_layers",
    "signal_conflict_count",
)
OUTPUT_SIGNAL_KEYS = (
    "waived_layer_count",
    "missing_upstream_layer_count",
    "signal_conflict_count",
    "epistemic_penalty_width_pts",
    "abstain_recommended",
)
SOURCE_DATASETS = ("gse_layer_completeness_monitor",)
FRESHNESS_RULE = "Real-time synchronous audit across Layers 01..24"
CONSUMER = "L4_adversary"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    waived = game_input.get("waived_layers", {})
    missing = game_input.get("missing_layers", [])
    conflicts = int(game_input.get("signal_conflict_count", 0))

    waived_cnt = len(waived) if isinstance(waived, (dict, list)) else 0
    missing_cnt = len(missing) if isinstance(missing, (dict, list)) else 0
    penalty_pts = round(0.45 * waived_cnt + 0.95 * missing_cnt + 0.60 * conflicts, 4)

    signals = {
        "waived_layer_count": waived_cnt,
        "missing_upstream_layer_count": missing_cnt,
        "signal_conflict_count": conflicts,
        "epistemic_penalty_width_pts": penalty_pts,
        "abstain_recommended": bool(missing_cnt >= 3 or penalty_pts >= 2.5),
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
            "intelligence/reasoning/layers/layer_25_missingness_contradiction.py",
            "intelligence/reasoning/escalation.py",
        ),
        default_uncertainty_delta=round(0.002 + 0.01 * (waived_cnt + missing_cnt), 6),
    )
