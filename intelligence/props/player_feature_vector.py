#!/usr/bin/env python3
"""
intelligence/props/player_feature_vector.py
50-Feature Player x Situational State Interaction Model.
"""

from __future__ import annotations
from typing import Any


def build_player_feature_vector(base: dict[str, Any], state: dict[str, Any]) -> dict[str, float]:
    """
    Constructs the 50-feature player x situational interaction vector by crossing
    9 base tracking/usage measurements with coverage shell (two_high_rate, man_coverage_rate),
    opponent pass-rush pressure rate, injury/vacated state (wr1_out, primary_defender_out),
    and game-script trailing probability.
    """
    f: dict[str, float] = {}
    # Base (9)
    for k in [
        "soe_yd",
        "avg_separation",
        "adot",
        "target_share",
        "targets_per_route_run",
        "air_yard_share",
        "ryoe",
        "snap_share",
        "route_participation",
    ]:
        out_k = "tprr" if k == "targets_per_route_run" else k
        f[out_k] = float(base.get(k, base.get(out_k, 0.0)))

    soe = f["soe_yd"]
    sep = f["avg_separation"]
    adot = f["adot"]
    ts = f["target_share"]
    tprr = f["tprr"]
    air = f["air_yard_share"]
    ryoe = f["ryoe"]
    snap = f["snap_share"]
    route = f["route_participation"]

    two_high = float(state.get("two_high_rate", 0.48))
    man = float(state.get("man_coverage_rate", 0.28))
    press = float(state.get("pressure_rate", 0.32))
    trail = float(state.get("trailing_prob", 0.45))

    # Coverage & Pressure Interactions (12)
    f["soe_x_two_high"] = soe * two_high
    f["soe_x_man"] = soe * man
    f["sep_x_two_high"] = sep * two_high
    f["sep_x_man"] = sep * man
    f["adot_x_two_high"] = adot * two_high
    f["tprr_x_two_high"] = tprr * two_high
    f["air_x_two_high"] = air * two_high
    f["soe_x_pressure"] = soe * press
    f["sep_x_pressure"] = sep * press
    f["tprr_x_pressure"] = tprr * press
    f["adot_x_pressure"] = adot * press
    f["air_x_pressure"] = air * press

    # Injury / Vacated Interactions (6)
    wr1_out = 1.0 if state.get("wr1_out") else 0.0
    def_out = 1.0 if state.get("primary_defender_out") else 0.0
    f["target_share_x_wr1_out"] = ts * wr1_out
    f["tprr_x_wr1_out"] = tprr * wr1_out
    f["air_x_wr1_out"] = air * wr1_out
    f["soe_x_def_out"] = soe * def_out
    f["sep_x_def_out"] = sep * def_out
    f["ryoe_x_def_out"] = ryoe * def_out

    # Script Interactions (8)
    f["target_share_x_trail"] = ts * trail
    f["tprr_x_trail"] = tprr * trail
    f["ryoe_x_trail"] = ryoe * trail
    f["snap_x_trail"] = snap * trail
    f["adot_x_trail"] = adot * trail
    f["sep_x_trail"] = sep * trail
    f["soe_x_trail"] = soe * trail
    f["air_x_trail"] = air * trail

    # Additional Crossings (10)
    f["ryoe_x_two_high"] = ryoe * two_high
    f["ryoe_x_man"] = ryoe * man
    f["snap_x_two_high"] = snap * two_high
    f["route_x_two_high"] = route * two_high
    f["route_x_man"] = route * man
    f["route_x_pressure"] = route * press
    f["target_share_x_man"] = ts * man
    f["target_share_x_pressure"] = ts * press
    f["tprr_x_man"] = tprr * man
    f["snap_x_pressure"] = snap * press

    # Residuals & Context (5)
    f["soe_residual_two_high"] = soe * (1.0 - two_high)
    f["tprr_residual_trail"] = tprr * (1.0 - trail)
    f["short_week"] = 1.0 if state.get("short_week") else 0.0
    f["is_home"] = 1.0 if state.get("is_home") else 0.0
    f["trailing_prob"] = trail

    return f
