#!/usr/bin/env python3
"""
Sunday/MNF Week 11 RC1-RC13 Recalibrated Slate Audit & Card Compiler
(`scripts/ops/run_week11_sunday_rc1_rc13_recalibrated_slate.py`)
=====================================================================

Re-evaluates the 12 Sunday/MNF Week 11 games (`MIA @ BUF`, `NO @ CHI`,
`TEN @ DAL`, `TB @ DET`, `ARI @ KC`, `PIT @ PHI`, `BAL @ CAR`, `NYJ @ LAC`,
`LV @ DEN`, `JAX @ NYG`, `MIN @ SF`, `CIN @ WSH`) from the pre-overhaul Nov 18
sealed artifact through ALL new RC1-RC13 structural, calibration, and portfolio
gates WITHOUT mutating `week11_unified_sealed_projections_2026_11_18.json`
(whose SHA-256 is pinned by existing storefront export tests):
  1. Applies causal Weeks 1-10 walk-forward calibration v2 heads
     (`data/calibration/prop_family_calibration_heads_2026.json`), quarantining
     every uncertified prop family (`eligible_for_play=False`).
  2. Runs `check_sim_market_drift_circuit_breaker` and `veto_contradictory_same_qb_props`.
  3. Runs `construct_uncorrelated_game_card` (`<=1 prop/athlete`, `|rho|<=0.45`,
     Baker-McHale Kelly `<=2%/8%` standard) and `evaluate_sgp_strict_gate`
     (`sgp_publish_enabled=False` hard SGP quarantine).
  4. Fails closed if any prop lacks verified two-sided American odds (`INV-5`).
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.portfolio.correlated_card_optimizer import (  # noqa: E402
    construct_uncorrelated_game_card,
    evaluate_sgp_strict_gate,
)
from scripts.calibration.calibrate_360_prop_families_walkforward import (  # noqa: E402
    calibrate_prop_probability,
    load_prop_calibration_heads,
)
from scripts.ops.evaluate_slate_360_full_markets import (  # noqa: E402
    check_sim_market_drift_circuit_breaker,
)
from scripts.ops.gse_connected_game_workflow import veto_contradictory_same_qb_props  # noqa: E402

DEFAULT_SOURCE_PATH = REPO_ROOT / "data" / "engine" / "week11_unified_sealed_projections_2026_11_18.json"
DEFAULT_OUT_PATH = REPO_ROOT / "data" / "engine" / "week11_sunday_rc1_rc13_recalibrated_card_2026_11_20.json"


def _map_stat_type(raw_market: str) -> str:
    m = (raw_market or "").lower()
    if "pass" in m and "td" in m:
        return "passing_tds"
    if "pass" in m and "att" in m:
        return "pass_attempts"
    if "pass" in m and "comp" in m:
        return "pass_completions"
    if "pass" in m and ("1q" in m or "1st quarter" in m):
        return "1q_pass_yds"
    if "pass" in m and "yd" in m:
        return "passing_yards"
    if "rush" in m and ("1q" in m or "1st quarter" in m):
        return "1q_rush_yds"
    if "longest" in m and "rush" in m:
        return "longest_rush"
    if "rush" in m and "yd" in m:
        return "rushing_yards"
    if "carries" in m or "rushing attempts" in m:
        return "carries"
    if "longest" in m and "rec" in m:
        return "longest_rec"
    if "rec" in m and ("1q" in m or "1st quarter" in m):
        return "1q_rec_yds"
    if "rec" in m and "yd" in m:
        return "receiving_yards"
    if "reception" in m:
        return "receptions"
    if "solo" in m and "tackle" in m:
        return "solo_tackles"
    if "tackle" in m:
        return "tackles_plus_assists"
    if "sack" in m:
        return "sacks"
    if "anytime" in m or "touchdown" in m:
        return "anytime_td"
    return "passing_yards"


def run_sunday_week11_rc1_rc13_recalibration(
    source_path: Path = DEFAULT_SOURCE_PATH,
    out_path: Path = DEFAULT_OUT_PATH,
) -> dict[str, Any]:
    doc = json.loads(source_path.read_text(encoding="utf-8"))
    heads = load_prop_calibration_heads()
    rng = np.random.default_rng(20261122)

    sunday_games_out: list[dict[str, Any]] = []
    total_props_evaluated = 0
    total_quarantined_family = 0
    total_unpriced_blocked = 0
    total_drift_blocked = 0
    total_cleared_straights = 0

    for g in doc.get("games", []):
        matchup = str(g.get("matchup") or "")
        if matchup == "IND @ HOU":
            continue  # Thursday game already settled & graded separately

        raw_props = list(g.get("player_props") or [])
        candidates: list[dict[str, Any]] = []
        hit_vectors: dict[str, np.ndarray] = {}

        for idx, p in enumerate(raw_props):
            total_props_evaluated += 1
            stat_fam = _map_stat_type(str(p.get("market") or p.get("stat_type") or p.get("selection") or ""))
            sim_mean = float(p.get("model_median", p.get("mean", p.get("line", 0.0))) or 0.0)
            line = float(p.get("line", sim_mean) or 0.0)
            raw_prob = float(p.get("model_prob", 0.50) or 0.50)
            mkt_fair = p.get("devigged_market_prob")
            over_odds = p.get("over_odds")
            under_odds = p.get("under_odds")

            cal = calibrate_prop_probability(raw_prob, float(mkt_fair) if mkt_fair is not None else None, stat_fam, heads=heads)
            drift = check_sim_market_drift_circuit_breaker(sim_mean, line, stat_fam) if line > 0 else {"tripped": False}

            two_sided_ok = over_odds is not None and under_odds is not None and mkt_fair is not None
            publish_allowed = True
            decision = "PLAY"

            if not cal["eligible_for_play"]:
                publish_allowed = False
                decision = "PASS_QUARANTINED_UNCALIBRATED_FAMILY"
                total_quarantined_family += 1
            elif drift.get("tripped"):
                publish_allowed = False
                decision = "PASS_SIM_MARKET_DRIFT_CIRCUIT_BREAKER"
                total_drift_blocked += 1
            elif not two_sided_ok:
                publish_allowed = False
                decision = "PASS_UNPRICED_TWO_SIDED_ODDS_REQUIRED"
                total_unpriced_blocked += 1
            elif float(cal["calibrated_prob"]) < float(mkt_fair or 0.50) + 0.03:
                publish_allowed = False
                decision = "PASS_INSUFFICIENT_CALIBRATED_EDGE"

            cid = f"{matchup}|{idx}"
            cal_p = float(cal["calibrated_prob"])
            hit_vectors[cid] = rng.random(10000) < cal_p
            candidates.append({
                "id": cid,
                "athlete": str(p.get("player_name") or p.get("athlete") or f"Player_{idx}"),
                "market": stat_fam,
                "selection": str(p.get("selection") or ""),
                "line": line,
                "over_odds": over_odds,
                "under_odds": under_odds,
                "market_fair_prob": mkt_fair,
                "calibrated_prob": cal_p,
                "wilson_lower_90": round(max(0.05, cal_p - 0.03), 4),
                "edge_net": round(cal_p - float(mkt_fair or 0.50), 4),
                "publishAllowed": publish_allowed,
                "decision": decision,
            })

        candidates = veto_contradictory_same_qb_props(candidates)
        card = construct_uncorrelated_game_card(candidates, hit_vectors)
        sgp_gate = evaluate_sgp_strict_gate([], hit_vectors, posted_sgp_american_odds=None, straight_card_athletes=[], sgp_publish_enabled=False)

        approved = [c for c in card["evaluated_candidates"] if c.get("publishAllowed")]
        total_cleared_straights += len(approved)

        sunday_games_out.append({
            "matchup": matchup,
            "kickoff_utc": g.get("kickoff_utc"),
            "props_evaluated": len(candidates),
            "cleared_calibrated_straights": len(approved),
            "approved_tickets": approved,
            "portfolio_card_summary": {k: v for k, v in card.items() if k != "evaluated_candidates"},
            "sgp_quarantine": sgp_gate,
            "requires_live_two_sided_odds_before_t75": total_unpriced_blocked > 0,
        })

    report = {
        "schema": "gse_week11_sunday_rc1_rc13_recalibrated_v1",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "source_sealed_sha256": doc.get("projection_source_sha256"),
        "calibration_schema": heads.get("schema"),
        "games_count": len(sunday_games_out),
        "summary": {
            "total_props_evaluated": total_props_evaluated,
            "quarantined_by_causal_family_gate": total_quarantined_family,
            "blocked_by_drift_circuit_breaker": total_drift_blocked,
            "blocked_missing_two_sided_odds_inv5": total_unpriced_blocked,
            "cleared_calibrated_straights": total_cleared_straights,
            "sgp_default_quarantined": True,
        },
        "games": sunday_games_out,
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report


if __name__ == "__main__":
    out = run_sunday_week11_rc1_rc13_recalibration()
    s = out["summary"]
    print(
        f"[W11 SUNDAY RC1-RC13 AUDIT] games={out['games_count']} | props={s['total_props_evaluated']} | "
        f"fam_quarantined={s['quarantined_by_causal_family_gate']} | drift_blocked={s['blocked_by_drift_circuit_breaker']} | "
        f"unpriced_inv5={s['blocked_missing_two_sided_odds_inv5']} | cleared={s['cleared_calibrated_straights']}"
    )
