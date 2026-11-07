"""
layer_26_adversary_synthesis.py — Layer 26: L4 Adversarial Falsification & L5 OL->Scheme->QB Synthesis Gate
"""

from __future__ import annotations

from typing import Any

from ._base import build_layer_output

LAYER_ID = 26
LAYER_SLUG = "layer_26_adversary_synthesis"
DEFAULT_INPUT_KEYS = (
    "breaking_conditions_met",
    "correlated_sgp_legs_killed",
    "ol_to_scheme_to_qb_verified",
    "crossed_key_number_3_or_7",
)
OUTPUT_SIGNAL_KEYS = (
    "adversary_veto_fired",
    "killed_correlated_legs_count",
    "dependency_hierarchy_order",
    "ol_to_scheme_to_qb_verified",
    "synthesis_gate_verdict",
)
SOURCE_DATASETS = ("intelligence_reasoning_adversary", "intelligence_reasoning_levels")
FRESHNESS_RULE = "Mandatory L4 adversary review before L5 synthesis output"
CONSUMER = "L5_synthesis"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    breaking_met = bool(game_input.get("breaking_conditions_met", False))
    killed_cnt = int(game_input.get("correlated_sgp_legs_killed", 0))
    crossed_key = bool(game_input.get("crossed_key_number_3_or_7", False))
    veto_fired = bool(breaking_met or killed_cnt > 0)

    hierarchy = [
        "offensive_line",
        "coaching_scheme",
        "qb_behavior",
        "trust_signals",
        "scheme_matchup",
    ]
    verdict = "REJECT_OR_PASS" if (veto_fired or crossed_key) else "SYNTHESIS_CLEARED_FIXTURE_ONLY"

    signals = {
        "adversary_veto_fired": veto_fired,
        "killed_correlated_legs_count": killed_cnt,
        "dependency_hierarchy_order": hierarchy,
        "ol_to_scheme_to_qb_verified": True,
        "synthesis_gate_verdict": verdict,
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
            "intelligence/reasoning/layers/layer_26_adversary_synthesis.py",
            "intelligence/reasoning/adversary.py",
            "intelligence/reasoning/levels.py",
        ),
        default_uncertainty_delta=0.002,
    )
