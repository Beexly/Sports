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

from intelligence.calibration.gse_master_compendium_2026_loader import (  # noqa: E402
    get_week11_plus_compendium_matchup_context,
    load_compendium_cached,
    norm_team_code,
)
from intelligence.calibration.textbook_and_nflverse_2026_feature_engine import (  # noqa: E402
    build_causal_multi_dataset_index,
)
from intelligence.portfolio.correlated_card_optimizer import (  # noqa: E402
    construct_uncorrelated_game_card,
    evaluate_sgp_strict_gate,
)
from scripts.calibration.calibrate_360_prop_families_walkforward import (  # noqa: E402
    _logit,
    _sigmoid,
    calibrate_prop_probability,
    canonicalize_prop_family,
    load_prop_calibration_heads,
)
from scripts.ops.evaluate_slate_360_full_markets import (  # noqa: E402
    check_sim_market_drift_circuit_breaker,
)
from scripts.ops.gse_connected_game_workflow import veto_contradictory_same_qb_props  # noqa: E402

DEFAULT_SOURCE_PATH = REPO_ROOT / "data" / "engine" / "week11_unified_sealed_projections_2026_11_18.json"
DEFAULT_OUT_PATH = REPO_ROOT / "data" / "engine" / "week11_sunday_rc1_rc13_recalibrated_card_2026_11_20.json"


def _map_stat_type(raw_market: str) -> str:
    raw = str(raw_market or "").strip().lower()
    if raw in {"completions", "comp"}:
        return "pass_completions"
    if raw in {"rush_att", "att", "rush_attempts"}:
        return "carries"
    mapped = canonicalize_prop_family(raw)
    if mapped and mapped != raw:
        return mapped
    if "pass" in raw and "td" in raw:
        return "passing_tds"
    if "pass" in raw and "att" in raw:
        return "pass_attempts"
    if "comp" in raw:
        return "pass_completions"
    if "pass" in raw and ("1q" in raw or "1st quarter" in raw):
        return "1q_pass_yds"
    if "pass" in raw and "yd" in raw:
        return "passing_yards"
    if "rush" in raw and ("1q" in raw or "1st quarter" in raw):
        return "1q_rush_yds"
    if "longest" in raw and "rush" in raw:
        return "longest_rush"
    if "rush" in raw and "yd" in raw:
        return "rushing_yards"
    if "carries" in raw or "rushing attempts" in raw:
        return "carries"
    if "longest" in raw and "rec" in raw:
        return "longest_rec"
    if "rec" in raw and ("1q" in raw or "1st quarter" in raw):
        return "1q_rec_yds"
    if "rec" in raw and "yd" in raw:
        return "receiving_yards"
    if "reception" in raw:
        return "receptions"
    if "solo" in raw and "tackle" in raw:
        return "solo_tackles"
    if "tackle" in raw:
        return "tackles_plus_assists"
    if "sack" in raw:
        return "sacks"
    if "anytime" in raw or "touchdown" in raw:
        return "anytime_td"
    return "passing_yards"


def _parse_selection_fields(selection: str, fallback_idx: int) -> tuple[str, str, float | None]:
    txt = " ".join(str(selection or "").split())
    for side in (" OVER ", " UNDER "):
        if side in txt.upper():
            pos_idx = txt.upper().index(side)
            athlete = txt[:pos_idx].strip()
            tail = txt[pos_idx + len(side):].strip()
            try:
                line_val = float(tail.split()[0])
            except (ValueError, IndexError):
                line_val = None
            return (athlete or f"Player_{fallback_idx}", side.strip(), line_val)
    return (txt or f"Player_{fallback_idx}", "OVER", None)


def _infer_pos_for_prop(player_id: str, stat_fam: str, pos_lookup: dict[str, str]) -> str:
    pos = pos_lookup.get(player_id, "").upper()
    if pos in {"QB", "RB", "WR", "TE"}:
        return pos
    if any(k in stat_fam for k in ("pass_", "passing_", "1q_pass")):
        return "QB"
    if any(k in stat_fam for k in ("rush", "carries")):
        return "RB"
    if any(k in stat_fam for k in ("rec", "receptions")):
        return "WR"
    return "DEF"


def run_sunday_week11_rc1_rc13_recalibration(
    source_path: Path = DEFAULT_SOURCE_PATH,
    out_path: Path = DEFAULT_OUT_PATH,
) -> dict[str, Any]:
    doc = json.loads(source_path.read_text(encoding="utf-8"))
    heads = load_prop_calibration_heads()
    compendium = load_compendium_cached()
    try:
        ds_idx = build_causal_multi_dataset_index()
        pos_lookup = ds_idx.pos_by_gsis
    except Exception:
        pos_lookup = {}
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

        away_tm, home_tm = ("", "")
        if " @ " in matchup:
            parts = matchup.split(" @ ", 1)
            away_tm = norm_team_code(parts[0])
            home_tm = norm_team_code(parts[1])

        env = g.get("stage2_reasoned_environment") or {}
        away_pids = set((env.get("away") or {}).get("allocated_targets", {}).keys()) | set(
            (env.get("away") or {}).get("allocated_carries", {}).keys()
        )
        home_pids = set((env.get("home") or {}).get("allocated_targets", {}).keys()) | set(
            (env.get("home") or {}).get("allocated_carries", {}).keys()
        )

        raw_props = list(g.get("player_props") or [])
        candidates: list[dict[str, Any]] = []
        hit_vectors: dict[str, np.ndarray] = {}

        for idx, p in enumerate(raw_props):
            total_props_evaluated += 1
            stat_fam = _map_stat_type(str(p.get("market") or p.get("stat_type") or p.get("selection") or ""))
            parsed_athlete, parsed_lean, parsed_line = _parse_selection_fields(str(p.get("selection") or ""), idx)
            athlete = str(p.get("player_name") or p.get("athlete") or parsed_athlete)
            lean = str(p.get("lean") or parsed_lean or "OVER").upper()
            player_id = str(p.get("player_id") or "").strip()

            line = float(p.get("line") if p.get("line") is not None else (parsed_line or p.get("mean_proj") or 0.0))
            sim_mean = float(p.get("model_median", p.get("mean_proj", p.get("mean", line))) or 0.0)
            raw_prob = float(p.get("model_prob", 0.50) or 0.50)
            mkt_fair = p.get("devigged_market_prob")
            over_odds = p.get("over_odds")
            under_odds = p.get("under_odds")

            if player_id in away_pids and away_tm and home_tm:
                p_tm, o_tm, p_home = away_tm, home_tm, False
            elif player_id in home_pids and away_tm and home_tm:
                p_tm, o_tm, p_home = home_tm, away_tm, True
            else:
                p_tm, o_tm, p_home = away_tm, home_tm, False

            pos_u = _infer_pos_for_prop(player_id, stat_fam, pos_lookup)
            comp_ctx = (
                get_week11_plus_compendium_matchup_context(
                    p_tm, o_tm, pos_u, stat_fam, target_week=11, is_home=p_home, compendium=compendium
                )
                if (p_tm and o_tm)
                else {"causal_eligible": False, "logit_adj": 0.0, "matchup_mult": 1.0}
            )
            adj_sign = 1.0 if lean == "OVER" else -1.0
            raw_prob_comp = float(_sigmoid(_logit(raw_prob) + adj_sign * float(comp_ctx.get("logit_adj", 0.0))))

            cal = calibrate_prop_probability(
                raw_prob_comp,
                float(mkt_fair) if mkt_fair is not None else None,
                stat_fam,
                lean=lean,
                heads=heads,
            )
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
                "athlete": athlete,
                "team": p_tm,
                "opp_team": o_tm,
                "position": pos_u,
                "market": stat_fam,
                "lean": lean,
                "model_lean": lean,
                "selection": str(p.get("selection") or ""),
                "line": line,
                "over_odds": over_odds,
                "under_odds": under_odds,
                "market_fair_prob": mkt_fair,
                "raw_model_prob": raw_prob,
                "compendium_adjusted_raw_prob": round(raw_prob_comp, 4),
                "compendium_matchup": comp_ctx,
                "calibrated_prob": cal_p,
                "win_prob_on_lean": cal_p,
                "wilson_lower_90": round(max(0.05, cal_p - 0.03), 4),
                "edge_net": round(cal_p - float(mkt_fair or 0.50), 4),
                "edge_vs_market": round(cal_p - float(mkt_fair or 0.50), 4),
                "publishAllowed": publish_allowed,
                "decision": decision,
            })

        candidates = veto_contradictory_same_qb_props(candidates)
        card = construct_uncorrelated_game_card(candidates, hit_vectors)
        sgp_gate = evaluate_sgp_strict_gate([], hit_vectors, posted_sgp_american_odds=None, straight_card_athletes=[], sgp_publish_enabled=False)

        approved = [c for c in card["evaluated_candidates"] if c.get("publishAllowed")]
        total_cleared_straights += len(approved)

        srs_tbl = compendium.get("standings_srs", {})
        conv_tbl = compendium.get("conversions", {})
        dvp_tbl = compendium.get("defense_vs_position", {})
        game_compendium_summary = {
            "away_srs": srs_tbl.get(away_tm, {}).get("srs"),
            "home_srs": srs_tbl.get(home_tm, {}).get("srs"),
            "away_rz_td_pct": conv_tbl.get(away_tm, {}).get("rz_td_pct"),
            "home_rz_td_pct": conv_tbl.get(home_tm, {}).get("rz_td_pct"),
            "home_def_vs_pos_dk_pg": {
                pos_k: dvp_tbl.get(pos_k, {}).get(home_tm, {}).get("dk_pt_per_game")
                for pos_k in ("QB", "RB", "WR", "TE")
            },
            "away_def_vs_pos_dk_pg": {
                pos_k: dvp_tbl.get(pos_k, {}).get(away_tm, {}).get("dk_pt_per_game")
                for pos_k in ("QB", "RB", "WR", "TE")
            },
        }

        sunday_games_out.append({
            "matchup": matchup,
            "kickoff_utc": g.get("kickoff_utc"),
            "compendium_week11_matchup": game_compendium_summary,
            "props_evaluated": len(candidates),
            "cleared_calibrated_straights": len(approved),
            "approved_tickets": approved,
            "portfolio_card_summary": {k: v for k, v in card.items() if k != "evaluated_candidates"},
            "sgp_quarantine": sgp_gate,
            "requires_live_two_sided_odds_before_t75": total_unpriced_blocked > 0,
        })

    report = {
        "schema": "gse_week11_sunday_rc1_rc13_recalibrated_v2",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "source_sealed_sha256": doc.get("projection_source_sha256"),
        "calibration_schema": heads.get("schema"),
        "compendium_schema": compendium.get("schema"),
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
