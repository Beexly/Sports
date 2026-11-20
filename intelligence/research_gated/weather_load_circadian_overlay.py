"""Research-Gated Module 2: Circadian Travel, Fatigue Load & Wind Drag Overlay (weight=0.0)."""
from __future__ import annotations

import math

PRODUCTION_WEIGHT: float = 0.0
OOS_GATE_REQUIRED: bool = True


def compute_weather_load_circadian_overlay(
    *,
    tz_shift_hours: float,
    travel_miles: float,
    rest_diff_days: float,
    wind_mph: float,
    temp_f: float,
    indoor: bool = False,
) -> dict[str, float | bool]:
    """Evaluate bounded OOS shadow log-odds shift from circadian load + weather (live weight=0.0)."""
    circadian_penalty = -0.028 * max(0.0, abs(float(tz_shift_hours)) - 1.0)
    travel_penalty = -0.00003 * max(0.0, float(travel_miles) - 500.0)
    rest_adj = 0.032 * max(-4.0, min(4.0, float(rest_diff_days)))

    if indoor:
        weather_total_delta = 0.0
    else:
        wind_excess = max(0.0, float(wind_mph) - 12.0)
        cold_excess = max(0.0, 34.0 - float(temp_f))
        weather_total_delta = max(-0.22, -0.012 * wind_excess - 0.004 * cold_excess)

    shadow_log_odds_delta = max(-0.30, min(0.30, circadian_penalty + travel_penalty + rest_adj))
    return {
        "production_weight": PRODUCTION_WEIGHT,
        "oos_gate_required": OOS_GATE_REQUIRED,
        "shadow_log_odds_delta": round(shadow_log_odds_delta, 6),
        "shadow_weather_total_delta": round(weather_total_delta, 6),
        "live_applied_log_odds_delta": round(shadow_log_odds_delta * PRODUCTION_WEIGHT, 8),
        "live_applied_weather_total_delta": round(weather_total_delta * PRODUCTION_WEIGHT, 8),
        "shadow_prob_multiplier": round(math.exp(shadow_log_odds_delta * PRODUCTION_WEIGHT), 6),
    }
