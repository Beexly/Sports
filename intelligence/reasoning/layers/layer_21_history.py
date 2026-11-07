"""
layer_21_history.py — Layer 21: Regime-Cleaned Historical Matchup Precedents & Stadium Split Priors
"""

from __future__ import annotations

from typing import Any

from ._base import build_layer_output

LAYER_ID = 21
LAYER_SLUG = "layer_21_history"
DEFAULT_INPUT_KEYS = (
    "same_coaching_regime_meetings",
    "historical_ats_margin_regime_cleaned",
    "tenures_overlap_weight",
)
OUTPUT_SIGNAL_KEYS = (
    "same_coaching_regime_meetings",
    "regime_cleaned_historical_margin_adj",
    "stale_history_contamination_rejected",
)
SOURCE_DATASETS = ("intelligence_coaching_tenures", "intelligence_reasoning_precedents")
FRESHNESS_RULE = "Seasonal coaching tenure & roster continuity decay tau"
CONSUMER = "trust_signals"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    meetings = int(game_input.get("same_coaching_regime_meetings", 2))
    hist_margin = float(game_input.get("historical_ats_margin_regime_cleaned", 1.8))
    overlap_w = float(game_input.get("tenures_overlap_weight", 0.42))

    margin_adj = round(hist_margin * overlap_w * min(1.0, meetings / 4.0), 4)

    signals = {
        "same_coaching_regime_meetings": meetings,
        "regime_cleaned_historical_margin_adj": margin_adj,
        "stale_history_contamination_rejected": True,
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
            "intelligence/reasoning/layers/layer_21_history.py",
            "intelligence/coaching/tenures.py",
            "intelligence/reasoning/precedents.py",
        ),
        default_uncertainty_delta=0.0015,
    )
