#!/usr/bin/env python3
"""
intelligence/props/target_conservation.py
Item 2 — Target Share Conservation + Empirical Bayes (James-Stein) Shrinkage + TE Committee Gate.

References:
- Efron & Morris (1977), "Stein's Paradox in Statistics" (Empirical Bayes shrinkage B = k / (n + k)).
- Gelman et al. (2013), Bayesian Data Analysis, Ch. 5 (Dirichlet-Multinomial compositional target conservation).
"""

from __future__ import annotations
from copy import deepcopy
from typing import Any

# 2026 NFL Positional Priors (targets per game, yards per target, catch rate, and QB pass yards)
POSITIONAL_PRIORS: dict[str, dict[str, float]] = {
    "WR1": {"targets_per_game": 8.4, "target_share": 0.245, "yards_per_target": 8.6, "catch_rate": 0.655},
    "WR2": {"targets_per_game": 6.0, "target_share": 0.175, "yards_per_target": 8.2, "catch_rate": 0.640},
    "WR3": {"targets_per_game": 3.8, "target_share": 0.110, "yards_per_target": 7.8, "catch_rate": 0.630},
    "TE1": {"targets_per_game": 4.8, "target_share": 0.140, "yards_per_target": 7.4, "catch_rate": 0.700},
    "TE_COMMITTEE": {"targets_per_game": 3.1, "target_share": 0.090, "yards_per_target": 7.1, "catch_rate": 0.690},
    "RB1": {"targets_per_game": 3.4, "target_share": 0.100, "yards_per_target": 6.1, "catch_rate": 0.760},
    "QB": {"pass_yards_per_game": 238.0, "yards_per_attempt": 7.15},
}


def shrink_rate(observed_rate: float, n_games: int, prior: float, k: float = 6.0) -> float:
    """
    Empirical Bayes / James-Stein linear shrinkage toward positional prior:
        theta_hat = (n / (n + k)) * observed_rate + (k / (n + k)) * prior
    Default stabilization constant k = 6.0 games.
    """
    n_eff = max(0.0, float(n_games))
    k_eff = max(0.001, float(k))
    weight_obs = n_eff / (n_eff + k_eff)
    return round(weight_obs * float(observed_rate) + (1.0 - weight_obs) * float(prior), 4)


def enforce_conservation(
    projections: list[dict[str, Any]],
    team_pass_attempts: float,
    cap: float = 0.96,
) -> list[dict[str, Any]]:
    """
    Enforces Dirichlet-Multinomial compositional target conservation across a team's
    receiving corps so that:
        sum_i projected_targets_i <= team_pass_attempts * cap
    ( leaving 1 - cap = 4% for throwaways/spikes/batted passes ).
    Supports both `projected_targets`/`projected_yards` and `targets`/`yards` dict keys.
    """
    out = deepcopy(projections)
    max_allocatable_targets = float(team_pass_attempts) * float(cap)
    total_targets = sum(float(p.get("projected_targets", p.get("targets", 0.0))) for p in out)

    scale_factor = 1.0
    if total_targets > max_allocatable_targets and total_targets > 0:
        scale_factor = max_allocatable_targets / total_targets

    for p in out:
        raw_t = float(p.get("projected_targets", p.get("targets", 0.0)))
        raw_y = float(p.get("projected_yards", p.get("yards", 0.0)))
        ypt = float(p.get("yards_per_target", 0.0))
        if ypt <= 0.0 and raw_t > 0.0:
            ypt = raw_y / raw_t

        new_t = round(raw_t * scale_factor, 2)
        new_y = round(new_t * ypt, 2) if ypt > 0 else round(raw_y * scale_factor, 2)
        p["projected_targets_unscaled"] = round(raw_t, 2)
        p["projected_targets"] = new_t
        p["targets"] = new_t
        p["conservation_scale"] = round(scale_factor, 4)
        p["projected_target_share"] = round(new_t / max(1.0, float(team_pass_attempts)), 4)
        p["projected_yards"] = new_y
        p["yards"] = new_y

    return out


enforce_target_conservation = enforce_conservation


def check_te_committee_gate(
    te_projection: dict[str, Any],
    te2_te3_route_share: float,
    threshold: float = 0.45,
) -> tuple[bool, str | None]:
    """
    TE Committee Gate:
    Blocks TE receiving overs when secondary/tertiary TEs (TE2 + TE3) account for > 45%
    of the TE room route/target share (e.g., LAR Tyler Higbee splitting snaps with
    Colby Parkinson and Davis Allen at 52.8% TE2+TE3 share).

    Returns (allowed: bool, gate_reason: str | None).
    """
    side = str(te_projection.get("side", "OVER")).upper()
    pos = str(te_projection.get("position", "TE")).upper()
    if pos == "TE" and side == "OVER" and float(te2_te3_route_share) > float(threshold):
        reason = (
            f"TE_COMMITTEE_GATE: TE2+TE3 route/target share {te2_te3_route_share:.1%} "
            f"exceeds {threshold:.0%} threshold; TE OVER blocked."
        )
        return False, reason
    return True, None


def reproject_team_receiving_stack(
    receivers: list[dict[str, Any]],
    team_pass_attempts: float,
    k: float = 6.0,
    cap: float = 0.96,
) -> list[dict[str, Any]]:
    """
    Full 3-step pipeline for a team receiving corps:
    1. Apply James-Stein shrinkage (k=6.0) to each receiver's observed targets/game and yards/target.
    2. Enforce Dirichlet-Multinomial conservation so sum(projected_targets) <= team_pass_attempts * cap.
    3. Apply TE Committee Gate on any TE OVER where `te2_te3_route_share > 0.45`.
    """
    shrunk_list: list[dict[str, Any]] = []
    for rec in receivers:
        item = deepcopy(rec)
        role = str(item.get("role", item.get("position", "WR2"))).upper()
        if role == "TE" and float(item.get("te2_te3_route_share", 0.0)) > 0.45:
            role = "TE_COMMITTEE"
        elif role == "TE":
            role = "TE1"
        prior_cfg = POSITIONAL_PRIORS.get(role, POSITIONAL_PRIORS["WR2"])

        n_games = int(item.get("n_games", 5))
        obs_tpg = float(item.get("observed_targets_pg", item.get("projected_targets", prior_cfg["targets_per_game"])))
        obs_ypt = float(
            item.get(
                "observed_ypt",
                (float(item.get("observed_yards_pg", 0.0)) / obs_tpg) if obs_tpg > 0 else prior_cfg["yards_per_target"],
            )
        )

        shrunk_tpg = shrink_rate(obs_tpg, n_games, prior_cfg["targets_per_game"], k=k)
        shrunk_ypt = shrink_rate(obs_ypt, n_games, prior_cfg["yards_per_target"], k=k)

        item["shrunk_targets_pg"] = shrunk_tpg
        item["yards_per_target"] = shrunk_ypt
        item["projected_targets"] = shrunk_tpg
        item["projected_yards"] = round(shrunk_tpg * shrunk_ypt, 2)
        shrunk_list.append(item)

    conserved = enforce_conservation(shrunk_list, team_pass_attempts=team_pass_attempts, cap=cap)

    for item in conserved:
        allowed, reason = check_te_committee_gate(
            item,
            te2_te3_route_share=float(item.get("te2_te3_route_share", 0.0)),
        )
        line = float(item.get("line", 0.0))
        proj_yds = float(item.get("projected_yards", 0.0))
        if not allowed:
            item["decision"] = "PASS"
            item["is_published"] = False
            item["gate_reason"] = reason
        else:
            edge_yds = proj_yds - line
            if abs(edge_yds) < 2.0:
                item["decision"] = "PASS"
                item["is_published"] = False
                item["gate_reason"] = f"INSUFFICIENT_EDGE: |{proj_yds:.1f} - {line:.1f}| < 2.0 yds"
            else:
                item["side"] = "OVER" if edge_yds > 0 else "UNDER"
                item["decision"] = "PLAY"
                item["is_published"] = True
                item["gate_reason"] = None

    return conserved


def project_qb_pass_yards_with_conservation(
    qb_observed_yards_pg: float,
    n_games: int,
    team_pass_attempts: float,
    conserved_receivers: list[dict[str, Any]],
    prior_yards_pg: float = 238.0,
    k: float = 6.0,
    line: float | None = None,
) -> dict[str, Any]:
    """
    Projects QB passing yards coupled to the conserved receiver room and Empirical Bayes
    shrinkage toward the league QB baseline (238.0 yds/G).
    """
    shrunk_qb_yds = shrink_rate(qb_observed_yards_pg, n_games, prior_yards_pg, k=k)
    receiver_sum_yds = sum(float(r.get("projected_yards", 0.0)) for r in conserved_receivers)
    # Account for ~14% auxiliary RB/WR4/TE2 checkdown yardage if only primary stack is passed
    total_allocated_targets = sum(float(r.get("projected_targets", 0.0)) for r in conserved_receivers)
    unallocated_attempts = max(0.0, float(team_pass_attempts) * 0.96 - total_allocated_targets)
    checkdown_yds = unallocated_attempts * 5.8
    coupled_yards = round(0.50 * shrunk_qb_yds + 0.50 * (receiver_sum_yds + checkdown_yds), 2)

    decision = "PLAY"
    rec_side = "OVER"
    gate_reason = None
    if line is not None:
        delta = coupled_yards - float(line)
        if abs(delta) < 3.5:
            decision = "PASS"
            rec_side = "PASS"
            gate_reason = f"QB_CONSERVATION_GATE: projected {coupled_yards:.1f} vs line {line:.1f} (insufficient Over edge)"
        elif delta < 0:
            decision = "PASS"  # Do not publish Over when conserved projection is below line
            rec_side = "UNDER"
            gate_reason = f"QB_CONSERVATION_FLIP: conserved projection {coupled_yards:.1f} < line {line:.1f}"

    return {
        "observed_yards_pg": qb_observed_yards_pg,
        "shrunk_yards_pg": shrunk_qb_yds,
        "coupled_projected_yards": coupled_yards,
        "team_pass_attempts": team_pass_attempts,
        "line": line,
        "recommended_side": rec_side,
        "decision": decision,
        "gate_reason": gate_reason,
    }
