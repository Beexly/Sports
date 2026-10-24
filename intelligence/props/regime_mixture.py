#!/usr/bin/env python3
"""
intelligence/props/regime_mixture.py
Item 4 — Game-Script Regime Mixture for RB Volume + Pocket-Depth Catch-Rate Penalty.

Addresses:
1. Unimodal RB carry assumptions in coin-flip / underdog games (e.g., Bijan Robinson had 6.8 YPC
   and +24.1 RYOE in Week 6 CHI @ ATL, yet finished with 61 yards on 9 carries because Atlanta
   trailed by 14+ points).
2. Unpenalized catch rates for perimeter WRs when QB pocket depth collapses (< 3.60 yds) against
   top-12 pressure fronts (e.g., Drake London 4 catches on 10 targets under 5 sacks at 3.45 yd
   pocket depth).
"""

from __future__ import annotations
from typing import Any


def project_rb_rush(base_carries: float, ypc: float, p_trail: float) -> float:
    """
    2-State Game-Script Regime Mixture for RB Rushing Yards:
      - State S_1 (Lead / Neutral, weight 1 - p_trail):
            lead_yards = base_carries * ypc
      - State S_2 (Trailing >= 7 pts, weight p_trail):
            trail_yards = (base_carries * 0.55) * (ypc * 0.85)
      Returns expected rushing yards E[Y] = (1 - p_trail) * lead_yards + p_trail * trail_yards.
    """
    p_t = max(0.0, min(1.0, float(p_trail)))
    lead_yards = float(base_carries) * float(ypc)
    trail_yards = (float(base_carries) * 0.55) * (float(ypc) * 0.85)
    expected_yards = (1.0 - p_t) * lead_yards + p_t * trail_yards
    return round(expected_yards, 2)


def evaluate_rb_prop_with_regime_mixture(
    base_carries: float,
    ypc: float,
    p_trail: float,
    line: float,
    player_name: str = "",
) -> dict[str, Any]:
    """
    Full diagnostic wrapper around `project_rb_rush` that computes the 2-state mixture,
    attaches an explicit `SCRIPT_RISK` flag when `p_trail >= 0.30` and `trail_yards < line`,
    and determines whether an OVER is playable or gated.
    """
    p_t = max(0.0, min(1.0, float(p_trail)))
    lead_yards = round(float(base_carries) * float(ypc), 2)
    trail_yards = round((float(base_carries) * 0.55) * (float(ypc) * 0.85), 2)
    mixture_yards = project_rb_rush(base_carries, ypc, p_t)

    script_risk = bool(p_t >= 0.30 and trail_yards < float(line))
    edge_yards = round(mixture_yards - float(line), 2)

    if mixture_yards < float(line):
        decision = "PASS"
        recommended_side = "UNDER"
        gate_reason = (
            f"RB_SCRIPT_MIXTURE_GATE: 2-state mixture {mixture_yards:.1f} yds "
            f"(lead={lead_yards:.1f}, trail={trail_yards:.1f}, p_trail={p_t:.0%}) "
            f"falls below line {line:.1f}."
        )
    elif script_risk and edge_yards < 4.0:
        decision = "PASS"
        recommended_side = "PASS"
        gate_reason = (
            f"SCRIPT_RISK_FLAG: p_trail={p_t:.0%} with trailing regime {trail_yards:.1f} yds "
            f"well below line {line:.1f}; insufficient cushion ({edge_yards:+.1f} yds)."
        )
    else:
        decision = "PLAY"
        recommended_side = "OVER"
        gate_reason = None

    return {
        "player": player_name,
        "unimodal_yards": lead_yards,
        "trail_regime_yards": trail_yards,
        "projected_yards": mixture_yards,
        "p_trail": round(p_t, 4),
        "line": float(line),
        "edge_yards": edge_yards,
        "script_risk_flag": script_risk,
        "recommended_side": recommended_side,
        "decision": decision,
        "gate_reason": gate_reason,
    }


def apply_pocket_penalty(
    catch_rate: float,
    pocket_depth: float,
    pressure_rank: int,
) -> float:
    """
    Applies a -8% multiplicative penalty (x 0.92) to a receiver's projected catch rate
    (or yards/target) when the quarterback's `vision.pocket_depth_yd < 3.60` against a
    top-12 opposing pass-rush front (`pressure_rank <= 12`).
    """
    if float(pocket_depth) < 3.60 and int(pressure_rank) <= 12:
        return round(float(catch_rate) * 0.92, 4)
    return round(float(catch_rate), 4)


project_rb_rush_yards = project_rb_rush
apply_pocket_catch_penalty = apply_pocket_penalty


def evaluate_wr_prop_with_pocket_penalty(
    projected_targets: float,
    base_catch_rate: float,
    yards_per_reception: float,
    pocket_depth: float,
    pressure_rank: int,
    line: float,
    player_name: str = "",
) -> dict[str, Any]:
    """
    Evaluates a WR receiving yards prop after applying the QB pocket-depth catch-rate penalty.
    """
    unpenalized_yards = round(float(projected_targets) * float(base_catch_rate) * float(yards_per_reception), 2)
    adj_catch_rate = apply_pocket_penalty(base_catch_rate, pocket_depth, pressure_rank)
    penalized_yards = round(float(projected_targets) * adj_catch_rate * float(yards_per_reception), 2)
    penalty_applied = adj_catch_rate < float(base_catch_rate)
    edge_yards = round(penalized_yards - float(line), 2)

    if penalized_yards < float(line):
        decision = "PASS"
        recommended_side = "UNDER"
        gate_reason = (
            f"POCKET_DEPTH_PENALTY_GATE: QB pocket_depth_yd={pocket_depth:.2f} (<3.60) vs "
            f"pressure_rank=#{pressure_rank} (<=12) reduces catch rate {base_catch_rate:.1%} -> "
            f"{adj_catch_rate:.1%} and yards {unpenalized_yards:.1f} -> {penalized_yards:.1f} (< {line:.1f})."
        )
    else:
        decision = "PLAY"
        recommended_side = "OVER"
        gate_reason = None

    return {
        "player": player_name,
        "projected_targets": round(float(projected_targets), 2),
        "base_catch_rate": round(float(base_catch_rate), 4),
        "adjusted_catch_rate": adj_catch_rate,
        "penalty_applied": penalty_applied,
        "unpenalized_yards": unpenalized_yards,
        "projected_yards": penalized_yards,
        "line": float(line),
        "edge_yards": edge_yards,
        "recommended_side": recommended_side,
        "decision": decision,
        "gate_reason": gate_reason,
    }

def evaluate_ratf_net_two_path_intermittent(
    p_active_regime: float,
    mu_jump_path: float,
    mu_smooth_path: float,
    intermittency_ratio: float = 0.0,
) -> dict:
    """OpenAlex W7223035214: RATF-Net regime-adaptive two-path intermittent forecaster."""
    p = min(max(float(p_active_regime), 0.0), 1.0)
    gate = min(max(p * (1.0 + 0.25 * max(0.0, float(intermittency_ratio) - 0.5)), 0.0), 1.0)
    y_hat = gate * float(mu_jump_path) + (1.0 - gate) * float(mu_smooth_path)
    return {
        "gate_probability": round(gate, 4),
        "forecast": round(y_hat, 4),
        "regime": "INTERMITTENT_JUMP" if gate >= 0.5 else "SMOOTH_CONTINUOUS",
    }


def evaluate_seven_model_jump_contingency(hazards: list[float], weights: list[float] | None = None) -> dict:
    """OpenAlex W7222995921: 7-model stochastic contingency & jump hazard synthesis."""
    if not hazards:
        return {"composite_hazard": 0.0, "survival_prob": 1.0, "dominant_model_index": -1}
    k = len(hazards)
    w = weights if (weights and len(weights) == k) else [1.0 / k] * k
    w_sum = sum(max(0.0, x) for x in w) or 1.0
    w_norm = [max(0.0, x) / w_sum for x in w]
    comp = sum(w_norm[i] * max(0.0, float(hazards[i])) for i in range(k))
    import math as _m
    surv = _m.exp(-comp)
    dom = max(range(k), key=lambda i: w_norm[i] * max(0.0, float(hazards[i])))
    return {
        "composite_hazard": round(comp, 4),
        "survival_prob": round(surv, 4),
        "dominant_model_index": int(dom),
    }

