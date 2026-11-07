"""
layer_23_market.py — Layer 23: Market Pricing Enters LAST (Shin De-Vig, Line-Move Velocity & SGP Copula Hold Check)
"""

from __future__ import annotations

import math
from typing import Any

from ._base import build_layer_output

LAYER_ID = 23
LAYER_SLUG = "layer_23_market"
DEFAULT_INPUT_KEYS = (
    "market_home_ml_decimal",
    "market_away_ml_decimal",
    "opening_spread_home",
    "current_spread_home",
    "market_total_points",
    "sgp_quoted_hold_pct",
)
OUTPUT_SIGNAL_KEYS = (
    "market_enters_last_verified",
    "shin_devig_home_win_prob",
    "shin_devig_away_win_prob",
    "shin_insider_parameter_z",
    "line_move_velocity_pts",
    "crossed_key_number_3_or_7",
    "sgp_copula_hold_check_passed",
)
SOURCE_DATASETS = ("nfl_odds_2026_closing_snapshots", "packages_prediction_engine_shin_devig")
FRESHNESS_RULE = "<= 15m pre-decision live consensus book screen"
CONSUMER = "L5_synthesis"


def _shin_devig_two_way(dec_home: float, dec_away: float) -> tuple[float, float, float]:
    q_home = 1.0 / max(1.01, dec_home)
    q_away = 1.0 / max(1.01, dec_away)
    s = q_home + q_away
    if s <= 1.0:
        return round(q_home / s, 6), round(q_away / s, 6), 0.0
    z = (s - 1.0) / max(1e-6, (2.0 - s))
    z = max(0.0, min(0.25, z))
    p_home = (math.sqrt(z * z + 4.0 * (1.0 - z) * (q_home * q_home) / s) - z) / (2.0 * (1.0 - z))
    p_away = 1.0 - p_home
    return round(p_home, 6), round(p_away, 6), round(z, 6)


def run_layer(game_input: dict[str, Any]) -> dict[str, Any]:
    dec_home = float(game_input.get("market_home_ml_decimal", 1.36))
    dec_away = float(game_input.get("market_away_ml_decimal", 3.25))
    open_spread = float(game_input.get("opening_spread_home", -6.5))
    curr_spread = float(game_input.get("current_spread_home", -7.5))
    sgp_hold = float(game_input.get("sgp_quoted_hold_pct", 0.145))

    p_home, p_away, shin_z = _shin_devig_two_way(dec_home, dec_away)
    move_vel = round(curr_spread - open_spread, 3)

    low_s, high_s = sorted((abs(open_spread), abs(curr_spread)))
    crossed_key = bool((low_s < 3.0 <= high_s) or (low_s < 7.0 <= high_s))

    signals = {
        "market_enters_last_verified": True,
        "shin_devig_home_win_prob": p_home,
        "shin_devig_away_win_prob": p_away,
        "shin_insider_parameter_z": shin_z,
        "line_move_velocity_pts": move_vel,
        "crossed_key_number_3_or_7": crossed_key,
        "sgp_copula_hold_check_passed": bool(sgp_hold <= 0.22),
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
            "intelligence/reasoning/layers/layer_23_market.py",
            "packages/prediction-engine/src/shin-devig.ts",
            "intelligence/reasoning/market_priors.py",
        ),
        default_uncertainty_delta=0.002,
    )
