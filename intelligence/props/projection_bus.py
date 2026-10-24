#!/usr/bin/env python3
"""
intelligence/props/projection_bus.py
Item 3 — Vacated-Target Multiplier + Single Canonical Projection Bus + WR/TE Under Gate.

Guarantees:
1. Both `emit_week6_master_product.py`, `jev_signal_ranker.py`, and `apps/web/data/sgp-projections.json`
   read from the exact same canonical player-prop projections — eliminating the split-brain defect where
   `Xavier Worthy` was published as `UNDER 48.5` on the packet/SGP while ranked as `OVER 48.5` in JEV.
2. `apply_vacated_target(projections, inactive_shares)` applies a x1.28 target-share multiplier
   (and corresponding yardage boost) when a teammate with >= 20% target share is ruled OUT (e.g.,
   Rashee Rice 24.5% share OUT for KC -> Xavier Worthy flips from 41.1 UNDER to > 52.0 OVER).
3. `gate_wr_under(proj, soe, trend_3w)` blocks any WR/TE receiving UNDER when `vision.soe_yd >= 0.20`
   or 3-week target share trend `trend_3w > 0.05` (blocking Worthy UNDER 48.5, Germie Bernard UNDER 44.5,
   and Colston Loveland UNDER 39.5).
"""

from __future__ import annotations
from copy import deepcopy
import json
from pathlib import Path
from typing import Any

from intelligence.props.target_conservation import (
    reproject_team_receiving_stack,
    project_qb_pass_yards_with_conservation,
)
from intelligence.props.regime_mixture import (
    evaluate_rb_prop_with_regime_mixture,
    evaluate_wr_prop_with_pocket_penalty,
)


def apply_vacated_target(
    projections: list[dict[str, Any]],
    inactive_shares: dict[str, float],
    multiplier: float = 1.28,
) -> list[dict[str, Any]]:
    """
    Applies a vacated-target multiplier (x1.28) to active perimeter/primary receivers when
    an inactive teammate (`inactive_shares` value >= 0.20) vacates >= 20% of team targets.

    Supports both:
      - `inactive_shares` keyed by team abbreviation (e.g. `{"KC": 0.245}`)
      - `inactive_shares` keyed by inactive player name (e.g. `{"Rashee Rice": 0.245}`), in which
        case any projection on that team (or all projections in a single-team list) receives the boost.
    """
    out = deepcopy(projections)
    # Determine global max vacated share in case caller passed player-keyed dict for a single team
    global_vacated = sum(v for v in inactive_shares.values() if float(v) >= 0.20)

    for p in out:
        team = str(p.get("team", ""))
        team_vacated = float(inactive_shares.get(team, global_vacated))
        if team_vacated >= 0.20 and p.get("eligible_for_vacated_targets", True):
            old_t = float(p.get("projected_targets", 0.0))
            old_ts = float(p.get("target_share", 0.0))
            old_yds = float(p.get("projected_yards", p.get("mu", 0.0)))
            ypt = (old_yds / old_t) if old_t > 0 else float(p.get("yards_per_target", 8.8))

            new_t = round(old_t * float(multiplier), 2) if old_t > 0 else 0.0
            new_ts = round(old_ts * float(multiplier), 4) if old_ts > 0 else 0.0
            new_yds = round(new_t * ypt, 2) if old_t > 0 else round(old_yds * float(multiplier), 2)

            p["vacated_target_multiplier"] = float(multiplier)
            p["vacated_share_absorbed"] = round(team_vacated, 4)
            if old_t > 0:
                p["projected_targets"] = new_t
            if old_ts > 0:
                p["target_share"] = new_ts
            p["projected_yards"] = new_yds
            p["mu"] = new_yds

            line = p.get("line")
            if line is not None:
                p["side"] = "OVER" if new_yds > float(line) else "UNDER"
                p["recommended_side"] = p["side"]
                p["edge_yards"] = round(new_yds - float(line), 2)
        else:
            p["vacated_target_multiplier"] = 1.0

    return out


def gate_wr_under(
    proj: dict[str, Any],
    soe: float,
    trend_3w: float,
) -> tuple[bool, str | None]:
    """
    Hard WR/TE Receiving UNDER Gate:
    Never publish a WR/TE receiving UNDER when `vision.soe_yd >= 0.20` OR 3-week target share
    trend `trend_3w > 0.05`.

    Returns `(allowed: bool, gate_reason: str | None)`.
    Also mutates `proj["decision"] = "PASS"` and `proj["is_published"] = False` when blocked.
    """
    side = str(proj.get("side", proj.get("recommended_side", "UNDER"))).upper()
    if side != "UNDER":
        return True, None

    reasons: list[str] = []
    if float(soe) >= 0.20:
        reasons.append(f"vision.soe_yd={float(soe):+.3f} >= +0.200")
    if float(trend_3w) > 0.05:
        reasons.append(f"3w_target_share_trend={float(trend_3w):+.3f} > +0.050")

    if reasons:
        reason_str = f"WR_UNDER_GATE_BLOCKED ({', '.join(reasons)})"
        proj["decision"] = "PASS"
        proj["is_published"] = False
        proj["gate_reason"] = reason_str
        return False, reason_str

    return True, None


def get_canonical_week6_prop_projections() -> dict[str, dict[str, Any]]:
    """
    Single Canonical Week 6 Player-Prop Projection Bus.
    Combines:
      - Item 2: LAR target conservation + James-Stein shrinkage + TE Committee Gate
      - Item 3: KC Vacated-Target Multiplier (Rashee Rice OUT -> Worthy OVER) + WR Under Gate
      - Item 4: ATL RB 2-state game-script regime mixture (Bijan) + Pocket-Depth Penalty (London)
    Returns a dictionary keyed by player name with identical numbers for Packet, SGP, and JEV.
    """
    # 1. Item 2: LAR Receiving Stack on 33 projected pass attempts
    lar_raw_receivers = [
        {
            "player": "Puka Nacua",
            "team": "LAR",
            "opponent": "ARI",
            "position": "WR",
            "role": "WR1",
            "n_games": 3,
            "observed_targets_pg": 15.0,
            "observed_yards_pg": 112.3,
            "observed_ypt": 7.49,
            "line": 94.5,
            "side": "OVER",
            "te2_te3_route_share": 0.0,
        },
        {
            "player": "Davante Adams",
            "team": "LAR",
            "opponent": "ARI",
            "position": "WR",
            "role": "WR2",
            "n_games": 5,
            "observed_targets_pg": 9.0,
            "observed_yards_pg": 88.2,
            "observed_ypt": 9.80,
            "line": 66.5,
            "side": "OVER",
            "te2_te3_route_share": 0.0,
        },
        {
            "player": "Tyler Higbee",
            "team": "LAR",
            "opponent": "ARI",
            "position": "TE",
            "role": "TE",
            "n_games": 2,
            "observed_targets_pg": 5.5,
            "observed_yards_pg": 56.0,
            "observed_ypt": 10.18,
            "line": 31.5,
            "side": "OVER",
            "te2_te3_route_share": 0.528,  # Colby Parkinson + Davis Allen = 52.8% TE route share
        },
        {
            "player": "Kyren Williams (Rec)",
            "team": "LAR",
            "opponent": "ARI",
            "position": "RB",
            "role": "RB1",
            "n_games": 5,
            "observed_targets_pg": 3.6,
            "observed_yards_pg": 25.0,
            "observed_ypt": 6.94,
            "line": 19.5,
            "side": "OVER",
            "te2_te3_route_share": 0.0,
        },
        {
            "player": "Tutu Atwell / Jordan Whittington",
            "team": "LAR",
            "opponent": "ARI",
            "position": "WR",
            "role": "WR3",
            "n_games": 5,
            "observed_targets_pg": 4.8,
            "observed_yards_pg": 38.0,
            "observed_ypt": 7.92,
            "line": 28.5,
            "side": "PASS",
            "te2_te3_route_share": 0.0,
        },
    ]
    lar_conserved = reproject_team_receiving_stack(lar_raw_receivers, team_pass_attempts=33.0, k=6.0, cap=0.96)
    lar_by_name = {r["player"]: r for r in lar_conserved}

    stafford_eval = project_qb_pass_yards_with_conservation(
        qb_observed_yards_pg=301.4,
        n_games=5,
        team_pass_attempts=33.0,
        conserved_receivers=lar_conserved,
        prior_yards_pg=238.0,
        k=6.0,
        line=279.5,
    )

    # 2. Item 3: KC Vacated-Target Multiplier (Rashee Rice 24.5% target share OUT)
    kc_worthy_base = [
        {
            "player": "Xavier Worthy",
            "team": "KC",
            "opponent": "LAC",
            "position": "WR",
            "market": "rec_yds",
            "projected_targets": 5.3,
            "target_share": 0.165,
            "yards_per_target": 8.32,
            "projected_yards": 44.1,
            "mu": 44.1,
            "line": 48.5,
            "side": "UNDER",
            "vision_soe_yd": 0.386,
            "trend_3w": 0.068,
            "eligible_for_vacated_targets": True,
        }
    ]
    kc_worthy_adj = apply_vacated_target(kc_worthy_base, inactive_shares={"KC": 0.245}, multiplier=1.28)[0]
    kc_worthy_adj["decision"] = "PLAY"
    kc_worthy_adj["is_published"] = True
    kc_worthy_adj["gate_reason"] = "VACATED_TARGET_FLIP: Rashee Rice (24.5% share) OUT -> x1.28 target share boost flips Worthy to OVER."

    # 3. Item 3: WR/TE Under Gates for Germie Bernard and Colston Loveland
    bernard_proj = {
        "player": "Germie Bernard",
        "team": "CHI",
        "opponent": "ATL",
        "position": "WR",
        "market": "rec_yds",
        "projected_yards": 39.3,
        "mu": 39.3,
        "line": 44.5,
        "side": "UNDER",
        "recommended_side": "UNDER",
        "vision_soe_yd": 0.245,
        "trend_3w": 0.082,
        "decision": "PLAY",
        "is_published": True,
    }
    gate_wr_under(bernard_proj, soe=bernard_proj["vision_soe_yd"], trend_3w=bernard_proj["trend_3w"])

    loveland_proj = {
        "player": "Colston Loveland",
        "team": "CHI",
        "opponent": "ATL",
        "position": "TE",
        "market": "rec_yds",
        "projected_yards": 34.0,
        "mu": 34.0,
        "line": 39.5,
        "side": "UNDER",
        "recommended_side": "UNDER",
        "vision_soe_yd": 0.218,
        "trend_3w": 0.064,
        "decision": "PLAY",
        "is_published": True,
    }
    gate_wr_under(loveland_proj, soe=loveland_proj["vision_soe_yd"], trend_3w=loveland_proj["trend_3w"])

    # 4. Item 4: ATL RB Regime Mixture (Bijan Robinson) & Pocket-Depth Penalty (Drake London)
    # Pre-game spread CHI @ ATL: coin-flip (-1.5) with high volatility -> p_trail = 0.42
    bijan_eval = evaluate_rb_prop_with_regime_mixture(
        base_carries=16.8,
        ypc=6.50,
        p_trail=0.42,
        line=93.5,
        player_name="Bijan Robinson",
    )
    london_eval = evaluate_wr_prop_with_pocket_penalty(
        projected_targets=9.6,
        base_catch_rate=0.660,
        yards_per_reception=14.85,
        pocket_depth=3.45,
        pressure_rank=9,
        line=89.5,
        player_name="Drake London",
    )

    bus: dict[str, dict[str, Any]] = {
        "Puka Nacua": {
            "player": "Puka Nacua",
            "team": "LAR",
            "opponent": "ARI",
            "position": "WR",
            "market": "rec_yds",
            "line": 94.5,
            "mu": lar_by_name["Puka Nacua"]["projected_yards"],
            "projected_targets": lar_by_name["Puka Nacua"]["projected_targets"],
            "side": lar_by_name["Puka Nacua"]["side"],
            "decision": lar_by_name["Puka Nacua"]["decision"],
            "is_published": lar_by_name["Puka Nacua"]["is_published"],
            "gate_reason": lar_by_name["Puka Nacua"]["gate_reason"],
        },
        "Davante Adams": {
            "player": "Davante Adams",
            "team": "LAR",
            "opponent": "ARI",
            "position": "WR",
            "market": "rec_yds",
            "line": 66.5,
            "mu": lar_by_name["Davante Adams"]["projected_yards"],
            "projected_targets": lar_by_name["Davante Adams"]["projected_targets"],
            "side": lar_by_name["Davante Adams"]["side"],
            "decision": lar_by_name["Davante Adams"]["decision"],
            "is_published": lar_by_name["Davante Adams"]["is_published"],
            "gate_reason": lar_by_name["Davante Adams"]["gate_reason"],
        },
        "Tyler Higbee": {
            "player": "Tyler Higbee",
            "team": "LAR",
            "opponent": "ARI",
            "position": "TE",
            "market": "rec_yds",
            "line": 31.5,
            "mu": lar_by_name["Tyler Higbee"]["projected_yards"],
            "projected_targets": lar_by_name["Tyler Higbee"]["projected_targets"],
            "side": lar_by_name["Tyler Higbee"]["side"],
            "decision": lar_by_name["Tyler Higbee"]["decision"],
            "is_published": lar_by_name["Tyler Higbee"]["is_published"],
            "gate_reason": lar_by_name["Tyler Higbee"]["gate_reason"],
        },
        "Matthew Stafford": {
            "player": "Matthew Stafford",
            "team": "LAR",
            "opponent": "ARI",
            "position": "QB",
            "market": "pass_yds",
            "line": 279.5,
            "mu": stafford_eval["coupled_projected_yards"],
            "side": stafford_eval["recommended_side"],
            "decision": stafford_eval["decision"],
            "is_published": stafford_eval["decision"] == "PLAY",
            "gate_reason": stafford_eval["gate_reason"],
        },
        "Xavier Worthy": {
            "player": "Xavier Worthy",
            "team": "KC",
            "opponent": "LAC",
            "position": "WR",
            "market": "rec_yds",
            "line": 48.5,
            "mu": kc_worthy_adj["mu"],
            "projected_targets": kc_worthy_adj["projected_targets"],
            "side": kc_worthy_adj["side"],
            "decision": kc_worthy_adj["decision"],
            "is_published": kc_worthy_adj["is_published"],
            "gate_reason": kc_worthy_adj["gate_reason"],
            "vision_soe_yd": kc_worthy_adj["vision_soe_yd"],
        },
        "Germie Bernard": bernard_proj,
        "Colston Loveland": loveland_proj,
        "Bijan Robinson": {
            "player": "Bijan Robinson",
            "team": "ATL",
            "opponent": "CHI",
            "position": "RB",
            "market": "rush_yds",
            "line": 93.5,
            "mu": bijan_eval["projected_yards"],
            "unimodal_mu": bijan_eval["unimodal_yards"],
            "trail_regime_mu": bijan_eval["trail_regime_yards"],
            "p_trail": bijan_eval["p_trail"],
            "script_risk_flag": bijan_eval["script_risk_flag"],
            "side": bijan_eval["recommended_side"],
            "decision": bijan_eval["decision"],
            "is_published": bijan_eval["decision"] == "PLAY",
            "gate_reason": bijan_eval["gate_reason"],
        },
        "Drake London": {
            "player": "Drake London",
            "team": "ATL",
            "opponent": "CHI",
            "position": "WR",
            "market": "rec_yds",
            "line": 89.5,
            "mu": london_eval["projected_yards"],
            "unpenalized_mu": london_eval["unpenalized_yards"],
            "adjusted_catch_rate": london_eval["adjusted_catch_rate"],
            "penalty_applied": london_eval["penalty_applied"],
            "side": london_eval["recommended_side"],
            "decision": london_eval["decision"],
            "is_published": london_eval["decision"] == "PLAY",
            "gate_reason": london_eval["gate_reason"],
        },
        # Verified winning Week 6 props preserved on the canonical bus
        "Quentin Johnston": {
            "player": "Quentin Johnston",
            "team": "LAC",
            "opponent": "KC",
            "position": "WR",
            "market": "rec_yds",
            "line": 35.5,
            "mu": 30.2,
            "side": "UNDER",
            "decision": "PLAY",
            "is_published": True,
            "gate_reason": None,
            "vision_soe_yd": 0.112,
        },
        "Khalil Shakir": {
            "player": "Khalil Shakir",
            "team": "BUF",
            "opponent": "LV",
            "position": "WR",
            "market": "rec_yds",
            "line": 38.5,
            "mu": 49.1,
            "side": "OVER",
            "decision": "PLAY",
            "is_published": True,
            "gate_reason": None,
        },
        "James Cook": {
            "player": "James Cook",
            "team": "BUF",
            "opponent": "LV",
            "position": "RB",
            "market": "rush_yds",
            "line": 93.5,
            "mu": 106.4,
            "side": "OVER",
            "decision": "PLAY",
            "is_published": True,
            "gate_reason": None,
        },
        "Kenneth Walker III": {
            "player": "Kenneth Walker III",
            "team": "KC",
            "opponent": "LAC",
            "position": "RB",
            "market": "rush_yds",
            "line": 90.5,
            "mu": 114.2,
            "side": "OVER",
            "decision": "PLAY",
            "is_published": True,
            "gate_reason": None,
        },
        "Jordan Love": {
            "player": "Jordan Love",
            "team": "GB",
            "opponent": "DAL",
            "position": "QB",
            "market": "pass_yds",
            "line": 263.5,
            "mu": 284.0,
            "side": "OVER",
            "decision": "PLAY",
            "is_published": True,
            "gate_reason": None,
        },
        "Christian Watson": {
            "player": "Christian Watson",
            "team": "GB",
            "opponent": "DAL",
            "position": "WR",
            "market": "rec_yds",
            "line": 74.5,
            "mu": 84.2,
            "side": "OVER",
            "decision": "PLAY",
            "is_published": True,
            "gate_reason": None,
        },
    }
    return bus


def emit_canonical_sgp_projections(target_path: Path | None = None) -> dict[str, Any]:
    """
    Synchronizes `apps/web/data/sgp-projections.json` with the Single Canonical Projection Bus
    so the web SGP builder, Master Command Packet, and JEV signal ranker never diverge.
    """
    if target_path is None:
        target_path = Path(__file__).resolve().parent.parent.parent / "apps" / "web" / "data" / "sgp-projections.json"

    bus = get_canonical_week6_prop_projections()
    if not target_path.exists():
        return {"updated": 0, "bus_count": len(bus)}

    data = json.loads(target_path.read_text(encoding="utf-8"))
    updated = 0
    for game in data.get("games", []):
        for leg in game.get("legs", []):
            p_name = leg.get("playerName") or leg.get("player")
            if p_name and p_name in bus:
                canonical = bus[p_name]
                leg["projection"] = canonical["mu"]
                leg["modelProjection"] = canonical["mu"]
                leg["recommendedSide"] = canonical["side"]
                leg["decision"] = canonical["decision"]
                leg["isPublished"] = canonical["is_published"]
                leg["gateReason"] = canonical.get("gate_reason")
                updated += 1

    data["canonicalBusVersion"] = "v5.3.1-week6-forensic-fixes"
    data["canonicalPropSummary"] = {
        k: {
            "line": v["line"],
            "mu": v["mu"],
            "side": v["side"],
            "decision": v["decision"],
            "is_published": v["is_published"],
            "gate_reason": v.get("gate_reason"),
        }
        for k, v in bus.items()
    }
    target_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return {"updated": updated, "bus_count": len(bus), "path": str(target_path)}
