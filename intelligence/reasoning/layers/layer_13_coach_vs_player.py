"""
layer_13_coach_vs_player.py — Layer 13: DC Blitz & Bracket Targeting vs Star Skill / QB Hot-Read Vulnerability
"""

from __future__ import annotations

from typing import Any

from ._base import build_layer_output

LAYER_ID = 13
LAYER_SLUG = "layer_13_coach_vs_player"
DEFAULT_INPUT_KEYS = (
    "dc_star_wr_double_rate",
    "dc_simulated_pressure_rate",
    "qb_epa_vs_sim_pressure",
    "rb_pass_pro_pickup_grade",
)
OUTPUT_SIGNAL_KEYS = (
    "wr1_bracket_suppression_factor",
    "wr2_te1_funnel_target_boost",
    "qb_sim_pressure_vulnerability_epa",
    "rb_blitz_pickup_reliability",
)
SOURCE_DATASETS = ("intelligence_coaching_dc_pressure", "intelligence_coaching_qb_disguise_blitz_matrix")
FRESHNESS_RULE = "<= 48h opponent game-plan bracket & pressure tendency"
CONSUMER = "qb_behavior"


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    double_rate = float(game_input.get("dc_star_wr_double_rate", 0.28))
    sim_rate = float(game_input.get("dc_simulated_pressure_rate", 0.29))
    qb_sim_epa = float(game_input.get("qb_epa_vs_sim_pressure", 0.045))
    rb_pro = float(game_input.get("rb_pass_pro_pickup_grade", 0.78))

    wr1_supp = round(-0.32 * double_rate, 4)
    funnel_boost = round(0.24 * double_rate + 0.12 * sim_rate, 4)
    qb_vuln = round(sim_rate * qb_sim_epa, 4)

    signals = {
        "wr1_bracket_suppression_factor": wr1_supp,
        "wr2_te1_funnel_target_boost": funnel_boost,
        "qb_sim_pressure_vulnerability_epa": qb_vuln,
        "rb_blitz_pickup_reliability": round(rb_pro, 4),
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
            "intelligence/reasoning/layers/layer_13_coach_vs_player.py",
            "intelligence/coaching/dc_pressure.py",
            "intelligence/coaching/qb_disguise_blitz_matrix.py",
        ),
        default_uncertainty_delta=0.002,
    )
