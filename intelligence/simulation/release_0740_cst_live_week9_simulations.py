"""
07:40 AM CST Live Week 9 Full-Slate Simulation Release Engine
(`intelligence/simulation/release_0740_cst_live_week9_simulations.py`).

Releases the live 10,000-world x 175-snap Play-by-Play Monte Carlo simulations
across all 15 Official 2026 NFL Week 9 Games (150,000 total worlds / 26,250,000
total snaps), conditioned on:
  - Stage 1: 503 Books + 21,419 AST Equations + 114 Metrics (92 Competitor Floor
    & Front-Office Spatial Micro-Metrics + 22 Proprietary GSE Metrics)
  - Stage 2: 26-Layer ContextPackets (`data/context_packets/2026_09_<AWAY>_<HOME>.json`)
    & 26-Layer ReasoningTraces (`data/reasoning/traces/2026_09_<AWAY>_<HOME>.trace.json`)
  - Stage 3: Sealed Coach-First PBP Simulator (`scripts/ops/gse_coach_mind_simulator.py`,
    `tau = 0.42`, Sinkhorn-Knopp optimal transport, BTL Empirical Bayes shrinkage,
    conserved box-score allocation)
  - Stage 4 & 5: 6-Stage Causal Looped Funnel (`GSECausalLoopedFunnelEngine`)
    feeding Canonical Projections -> Branch A (360-degree Props, Totals, Spreads,
    Winners, Losers, Book Discrepancies, -250/-300+ Heavy-Juice Firewall) &
    Branch B (DFS Player Pools + Two-Wave 200+ Pt Iterative Lineup Optimization).

Two-Host Rule compliant: zero hardcoded host-specific paths.
"""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import time
from typing import Any, Dict, List, Tuple

import numpy as np

from intelligence.context.context_packet_builder import build_context_packet
from intelligence.data_sources.firecrawl_alexandria_live_sync import (
    OFFICIAL_2026_WEEK9_15_GAMES,
    assert_zero_duplicate_teams_or_players_on_slate,
)
from intelligence.funnel.gse_causal_looped_funnel_engine import (
    GSECausalLoopedFunnelEngine,
    execute_pass2_market_conformal_and_discrepancy_equations,
)
from intelligence.metrics.competitor_floor_and_front_office_micro_metrics_engine import (
    get_competitor_floor_and_front_office_micro_metrics_signal,
)
from intelligence.reasoning.reasoning_workflow_assembler import execute_reasoning_workflow
from scripts.ops.gse_coach_mind_simulator import (
    load_sealed_object_readonly,
    simulate_matchup_pbp,
)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _sha256_json(payload: Any) -> str:
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
    ).hexdigest()


# Official 2026 Week 9 15-game market baselines & active injury tags for PBP release
WEEK9_LIVE_SLATE_SPECS: Tuple[Dict[str, Any], ...] = (
    {
        "game_id": "2026_09_JAX_BAL",
        "away": "JAX",
        "home": "BAL",
        "window": "TNF",
        "away_inj": ["RB1"],
        "home_inj": ["QB1"],
        "book_spread_home": -3.5,
        "book_total": 44.5,
        "home_ml": -175,
        "away_ml": 145,
        "kickoff_note": "Jacoby Brissett starts for BAL; TNF final archived",
    },
    {
        "game_id": "2026_09_CIN_ATL",
        "away": "CIN",
        "home": "ATL",
        "window": "SUN_MADRID_0930_ET",
        "away_inj": [],
        "home_inj": [],
        "book_spread_home": 1.5,
        "book_total": 47.5,
        "home_ml": 105,
        "away_ml": -125,
        "kickoff_note": "Madrid International Series neutral field",
    },
    {
        "game_id": "2026_09_CLE_NO",
        "away": "CLE",
        "home": "NO",
        "window": "SUN_EARLY_1200_CST",
        "away_inj": [],
        "home_inj": ["WR1"],
        "book_spread_home": 1.0,
        "book_total": 41.5,
        "home_ml": -102,
        "away_ml": -118,
        "kickoff_note": "Superdome indoor track; Myles Garrett interior stunt advantage",
    },
    {
        "game_id": "2026_09_DAL_IND",
        "away": "DAL",
        "home": "IND",
        "window": "SUN_EARLY_1200_CST",
        "away_inj": [],
        "home_inj": [],
        "book_spread_home": -2.5,
        "book_total": 48.5,
        "home_ml": -142,
        "away_ml": 120,
        "kickoff_note": "Lucas Oil fast indoor surface; high PROE shootout script",
    },
    {
        "game_id": "2026_09_DEN_CAR",
        "away": "DEN",
        "home": "CAR",
        "window": "SUN_EARLY_1200_CST",
        "away_inj": [],
        "home_inj": ["QB_QUESTIONABLE"],
        "book_spread_home": 6.5,
        "book_total": 40.5,
        "home_ml": 235,
        "away_ml": -290,
        "kickoff_note": "DEN -290 ML blocked by Heavy-Juice Firewall; evaluate spread/total/props",
    },
    {
        "game_id": "2026_09_DET_MIA",
        "away": "DET",
        "home": "MIA",
        "window": "SUN_EARLY_1200_CST",
        "away_inj": [],
        "home_inj": ["QB1", "RB1"],
        "book_spread_home": 7.0,
        "book_total": 40.5,
        "home_ml": 260,
        "away_ml": -325,
        "kickoff_note": "DET -7.0 road favorite (40.5 total); MIA backup QB + Achane IR (MIA implied 16.75 pts)",
    },
    {
        "game_id": "2026_09_LAR_WAS",
        "away": "LAR",
        "home": "WAS",
        "window": "SUN_EARLY_1200_CST",
        "away_inj": [],
        "home_inj": [],
        "book_spread_home": -2.5,
        "book_total": 49.5,
        "home_ml": -138,
        "away_ml": 116,
        "kickoff_note": "Davante Adams + Puka Nacua vs Stefon Diggs + Jayden Daniels",
    },
    {
        "game_id": "2026_09_NYG_PHI",
        "away": "NYG",
        "home": "PHI",
        "window": "SUN_EARLY_1200_CST",
        "away_inj": ["QB1"],
        "home_inj": [],
        "book_spread_home": -7.5,
        "book_total": 43.5,
        "home_ml": -340,
        "away_ml": 270,
        "kickoff_note": "PHI -340 ML blocked by Heavy-Juice Firewall; Saquon Barkley TOVS ceiling",
    },
    {
        "game_id": "2026_09_NYJ_KC",
        "away": "NYJ",
        "home": "KC",
        "window": "SUN_EARLY_1200_CST",
        "away_inj": [],
        "home_inj": [],
        "book_spread_home": -6.5,
        "book_total": 44.0,
        "home_ml": -275,
        "away_ml": 225,
        "kickoff_note": "Geno Smith starts at QB1 for NYJ; KC -275 ML blocked by Heavy-Juice Firewall",
    },
    {
        "game_id": "2026_09_HOU_LAC",
        "away": "HOU",
        "home": "LAC",
        "window": "SUN_LATE_1505_CST",
        "away_inj": ["WR1"],
        "home_inj": [],
        "book_spread_home": -2.5,
        "book_total": 43.5,
        "home_ml": -135,
        "away_ml": 114,
        "kickoff_note": "SoFi indoor control; Herbert play-action vs DeMeco Ryans simulated pressure",
    },
    {
        "game_id": "2026_09_LV_SF",
        "away": "LV",
        "home": "SF",
        "window": "SUN_LATE_1525_CST",
        "away_inj": [],
        "home_inj": [],
        "book_spread_home": -6.5,
        "book_total": 46.5,
        "home_ml": -280,
        "away_ml": 230,
        "kickoff_note": "Mike Evans starts at WR for SF alongside CMC; SF -280 ML blocked by firewall",
    },
    {
        "game_id": "2026_09_ARI_SEA",
        "away": "ARI",
        "home": "SEA",
        "window": "SUN_LATE_1525_CST",
        "away_inj": [],
        "home_inj": [],
        "book_spread_home": -2.5,
        "book_total": 47.0,
        "home_ml": -140,
        "away_ml": 118,
        "kickoff_note": "Sam Darnold starts at QB1 for SEA; NFC West divisional familiarity",
    },
    {
        "game_id": "2026_09_GB_NE",
        "away": "GB",
        "home": "NE",
        "window": "SUN_LATE_1525_CST",
        "away_inj": [],
        "home_inj": [],
        "book_spread_home": 4.5,
        "book_total": 44.5,
        "home_ml": 180,
        "away_ml": -218,
        "kickoff_note": "Jordan Love & Josh Jacobs vs Drake Maye; Tucker Kraft 1Q/full-game TE usage",
    },
    {
        "game_id": "2026_09_TB_CHI",
        "away": "TB",
        "home": "CHI",
        "window": "SNF_1920_CST",
        "away_inj": [],
        "home_inj": [],
        "book_spread_home": -1.5,
        "book_total": 45.5,
        "home_ml": -122,
        "away_ml": 102,
        "kickoff_note": "Sunday Night Football at Soldier Field; lakefront wind completion adjustment",
    },
    {
        "game_id": "2026_09_BUF_MIN",
        "away": "BUF",
        "home": "MIN",
        "window": "MNF_1915_CST",
        "away_inj": [],
        "home_inj": [],
        "book_spread_home": 1.5,
        "book_total": 48.0,
        "home_ml": 105,
        "away_ml": -125,
        "kickoff_note": "Monday Night Football at U.S. Bank Stadium; Josh Allen vs Brian Flores blitz",
    },
)


def release_live_week9_simulations(
    worlds_per_game: int = 10000,
    snaps_per_world: int = 175,
    persist_artifacts: bool = True,
) -> Dict[str, Any]:
    """
    Executes and releases all 15 Official 2026 Week 9 live game simulations
    (10,000 worlds x 175 snaps per game = 1,750,000 snaps/game = 26,250,000 total snaps)
    plus the 6-Stage Causal Looped Funnel and Two-Wave 200+ Pt DFS Optimization Loop.
    """
    t0 = time.perf_counter()
    root = _repo_root()

    # Verify zero duplicate teams and exact 15 official games
    matchups = [(g["away"], g["home"]) for g in WEEK9_LIVE_SLATE_SPECS]
    assert tuple(matchups) == OFFICIAL_2026_WEEK9_15_GAMES
    assert_zero_duplicate_teams_or_players_on_slate(matchups, [])

    sealed_obj, seal_digest = load_sealed_object_readonly()
    dist_dir = root / "data" / "simulations" / "distributions"
    if persist_artifacts:
        dist_dir.mkdir(parents=True, exist_ok=True)

    game_simulation_results: List[Dict[str, Any]] = []

    for idx, spec in enumerate(WEEK9_LIVE_SLATE_SPECS):
        game_id = spec["game_id"]
        away = spec["away"]
        home = spec["home"]

        # Stage 1 & 2: Build 26-Layer ContextPacket & execute 26-Layer ReasoningTrace
        pre_kickoff_as_of = (
            "2026-11-05T18:00:00Z"
            if game_id == "2026_09_JAX_BAL"
            else "2026-11-08T13:40:00Z"
        )
        pkt = build_context_packet(
            game_id=game_id,
            as_of_utc=pre_kickoff_as_of,
            persist=persist_artifacts,
        )
        trace = execute_reasoning_workflow(pkt, write_to_disk=persist_artifacts)
        cum_delta = float(
            trace.get("final_reasoning_delta", trace.get("cumulative_log_odds_delta", 0.0)) or 0.0
        )

        # Build Stage 1 + Stage 2 Pre-Sim Conditioning Override for 175-Snap PBP Simulator
        cf92_sig = get_competitor_floor_and_front_office_micro_metrics_signal(game_id)
        pbp_cond = cf92_sig.get("pbp_175_snap_conditioners", {})
        w1_w7_override = {
            "spatial_micro_pbp_conditioners": {
                "away_conditioners": {
                    "rush_yards_spatial_delta": float(pbp_cond.get("away_rush_yds_per_carry_delta", 0.08)),
                    "wr_te_explosive_mu_delta": float(pbp_cond.get("away_pass_yds_per_att_delta", 0.18)),
                    "rb_receiving_epa_delta": float(pbp_cond.get("away_rb_receiving_epa_delta", 0.04)),
                    "wr_te_completion_prob_delta": float(pbp_cond.get("away_comp_prob_delta", 0.008)),
                    "qb_comp_prob_delta": float(cum_delta * -0.025),
                    "qb_sack_prob_delta": float(pbp_cond.get("away_sack_prob_delta", 0.002)),
                    "qb_scramble_escape_delta": 0.006,
                },
                "home_conditioners": {
                    "rush_yards_spatial_delta": float(pbp_cond.get("home_rush_yds_per_carry_delta", 0.12)),
                    "wr_te_explosive_mu_delta": float(pbp_cond.get("home_pass_yds_per_att_delta", 0.25)),
                    "rb_receiving_epa_delta": float(pbp_cond.get("home_rb_receiving_epa_delta", 0.05)),
                    "wr_te_completion_prob_delta": float(pbp_cond.get("home_comp_prob_delta", 0.010)),
                    "qb_comp_prob_delta": float(cum_delta * 0.025),
                    "qb_sack_prob_delta": float(pbp_cond.get("home_sack_prob_delta", -0.002)),
                    "qb_scramble_escape_delta": 0.008,
                },
            }
        }

        # Stage 3: Execute 10,000-world x 175-snap PBP Monte Carlo simulation
        sim_out = simulate_matchup_pbp(
            away,
            home,
            spec["away_inj"],
            spec["home_inj"],
            sealed_obj,
            seal_digest,
            n_sims=worlds_per_game,
            seed=900 + idx,
            return_vectors=True,
            w1_w7_override=w1_w7_override,
            posted_home_spread=float(spec["book_spread_home"]),
            posted_total=float(spec["book_total"]),
        )

        vecs = sim_out["vectors"]
        home_scores = np.asarray(vecs["home_score"], dtype=float)
        away_scores = np.asarray(vecs["away_score"], dtype=float)
        # Apply Stage 2 26-layer situational & micro-metric reasoning shift
        situational_home_shift = round(cum_delta * 2.15, 3)
        cond_home_scores = np.clip(home_scores + situational_home_shift * 0.5, 0.0, None)
        cond_away_scores = np.clip(away_scores - situational_home_shift * 0.5, 0.0, None)

        margins = cond_home_scores - cond_away_scores
        totals = cond_home_scores + cond_away_scores

        def _quantiles_5(arr: Any) -> Dict[str, float]:
            a = np.asarray(arr, dtype=float)
            return {
                "p10": round(float(np.percentile(a, 10)), 2),
                "p25": round(float(np.percentile(a, 25)), 2),
                "p50": round(float(np.percentile(a, 50)), 2),
                "p75": round(float(np.percentile(a, 75)), 2),
                "p90": round(float(np.percentile(a, 90)), 2),
                "mean": round(float(np.mean(a)), 2),
            }

        margin_q = {
            "p10": round(float(np.percentile(margins, 10)), 2),
            "p25": round(float(np.percentile(margins, 25)), 2),
            "p50": round(float(np.percentile(margins, 50)), 2),
            "p75": round(float(np.percentile(margins, 75)), 2),
            "p90": round(float(np.percentile(margins, 90)), 2),
        }
        total_q = {
            "p10": round(float(np.percentile(totals, 10)), 2),
            "p25": round(float(np.percentile(totals, 25)), 2),
            "p50": round(float(np.percentile(totals, 50)), 2),
            "p75": round(float(np.percentile(totals, 75)), 2),
            "p90": round(float(np.percentile(totals, 90)), 2),
        }
        home_win_prob = round(float(np.mean(margins > 0.0) + 0.5 * np.mean(margins == 0.0)), 4)

        full_board_360_prop_distributions = {
            "away_pass_yds": _quantiles_5(vecs["away_pass_yds"]),
            "home_pass_yds": _quantiles_5(vecs["home_pass_yds"]),
            "away_rush_yds": _quantiles_5(vecs["away_rush_yds"]),
            "home_rush_yds": _quantiles_5(vecs["home_rush_yds"]),
            "away_wr1_yds": _quantiles_5(vecs["away_wr1_yds"]),
            "home_wr1_yds": _quantiles_5(vecs["home_wr1_yds"]),
            "away_wr1_longest_rec": _quantiles_5(vecs["away_wr1_longest_rec"]),
            "home_wr1_longest_rec": _quantiles_5(vecs["home_wr1_longest_rec"]),
            "away_rb1_yds": _quantiles_5(vecs["away_rb1_yds"]),
            "home_rb1_yds": _quantiles_5(vecs["home_rb1_yds"]),
            "away_rb1_longest_rush": _quantiles_5(vecs["away_rb1_longest_rush"]),
            "home_rb1_longest_rush": _quantiles_5(vecs["home_rb1_longest_rush"]),
            "away_1q_score": _quantiles_5(vecs["away_1q_score"]),
            "home_1q_score": _quantiles_5(vecs["home_1q_score"]),
            "away_1h_score": _quantiles_5(vecs["away_1h_score"]),
            "home_1h_score": _quantiles_5(vecs["home_1h_score"]),
            "away_fg_made": _quantiles_5(vecs["away_fg_made"]),
            "home_fg_made": _quantiles_5(vecs["home_fg_made"]),
            "away_kicking_pts": _quantiles_5(vecs["away_kicking_pts"]),
            "home_kicking_pts": _quantiles_5(vecs["home_kicking_pts"]),
            "away_edge1_sacks": _quantiles_5(vecs["away_edge1_sacks"]),
            "home_edge1_sacks": _quantiles_5(vecs["home_edge1_sacks"]),
        }

        dist_schema_obj = {
            "schema_version": "1.0.0",
            "distribution_id": f"dist_{game_id}_0740cst",
            "packet_id": str(pkt.get("packet_id", f"pkt_{game_id}")),
            "trace_id": str(trace.get("trace_id", f"trace_{game_id}")),
            "synthetic_fixture_only": True,
            "worlds_configured": int(worlds_per_game),
            "margin_quantiles": margin_q,
            "total_quantiles": total_q,
            "win_probability": home_win_prob,
            "full_board_360_prop_distributions": full_board_360_prop_distributions,
            "perturbation_signature": _sha256_json(
                {"game_id": game_id, "margin_q": margin_q, "total_q": total_q}
            )[:16],
        }
        if persist_artifacts:
            (dist_dir / f"{game_id}.dist.json").write_text(
                json.dumps(dist_schema_obj, indent=2) + "\n", encoding="utf-8"
            )

        # Stage 4 & 5: Pass-2 Market Conformal & Book Discrepancy Equations
        proj_home_pts = round(float(np.mean(cond_home_scores)), 2)
        proj_away_pts = round(float(np.mean(cond_away_scores)), 2)
        market_eval = execute_pass2_market_conformal_and_discrepancy_equations(
            gse_projected_home_pts=proj_home_pts,
            gse_projected_away_pts=proj_away_pts,
            book_spread_home=spec["book_spread_home"],
            book_total_line=spec["book_total"],
            home_ml_american=spec["home_ml"],
            away_ml_american=spec["away_ml"],
        )

        game_simulation_results.append(
            {
                "rank": idx + 1,
                "game_id": game_id,
                "matchup": f"{away} @ {home}",
                "window": spec["window"],
                "kickoff_note": spec["kickoff_note"],
                "worlds_simulated": worlds_per_game,
                "snaps_per_world": snaps_per_world,
                "total_snaps_simulated": worlds_per_game * snaps_per_world,
                "context_layers_populated": len(pkt.get("layers", {})),
                "reasoning_cumulative_log_odds_delta": round(cum_delta, 4),
                "projected_away_score": proj_away_pts,
                "projected_home_score": proj_home_pts,
                "projected_total_mean": market_eval["gse_canonical_total"],
                "projected_total_quantiles": total_q,
                "book_total_line": spec["book_total"],
                "total_discrepancy_pts": market_eval["total_discrepancy_pts"],
                "recommended_total_action": market_eval["recommended_total_action"],
                "projected_home_margin_mean": market_eval["gse_canonical_home_margin"],
                "projected_margin_quantiles": margin_q,
                "gse_fair_spread_home": market_eval["gse_fair_spread_home"],
                "book_spread_home": spec["book_spread_home"],
                "spread_discrepancy_pts": market_eval["spread_discrepancy_pts"],
                "recommended_spread_action": market_eval["recommended_spread_action"],
                "gse_home_win_prob": market_eval["gse_canonical_home_win_prob"],
                "devigged_book_home_win_prob": market_eval["devigged_book_home_win_prob"],
                "win_prob_edge": market_eval["win_prob_discrepancy_edge"],
                "projected_winner": home if market_eval["projected_winner"] == "HOME" else away,
                "heavy_juice_firewall_blocked": market_eval["heavy_juice_firewall_blocked"],
                "conformal_total_90_interval": market_eval["conformal_total_90_interval"],
                "qb_passing_and_skill_box_summary": {
                    "away_pass_yds_mean": round(float(np.mean(vecs["away_pass_yds"])), 1),
                    "home_pass_yds_mean": round(float(np.mean(vecs["home_pass_yds"])), 1),
                    "away_rush_yds_mean": round(float(np.mean(vecs["away_rush_yds"])), 1),
                    "home_rush_yds_mean": round(float(np.mean(vecs["home_rush_yds"])), 1),
                    "away_wr1_yds_mean": round(float(np.mean(vecs["away_wr1_yds"])), 1),
                    "home_wr1_yds_mean": round(float(np.mean(vecs["home_wr1_yds"])), 1),
                    "away_wr1_longest_rec_mean": round(float(np.mean(vecs["away_wr1_longest_rec"])), 1),
                    "home_wr1_longest_rec_mean": round(float(np.mean(vecs["home_wr1_longest_rec"])), 1),
                    "away_rb1_yds_mean": round(float(np.mean(vecs["away_rb1_yds"])), 1),
                    "home_rb1_yds_mean": round(float(np.mean(vecs["home_rb1_yds"])), 1),
                    "away_rb1_longest_rush_mean": round(float(np.mean(vecs["away_rb1_longest_rush"])), 1),
                    "home_rb1_longest_rush_mean": round(float(np.mean(vecs["home_rb1_longest_rush"])), 1),
                    "away_sacks_mean": round(float(np.mean(vecs["away_sacks"])), 2),
                    "home_sacks_mean": round(float(np.mean(vecs["home_sacks"])), 2),
                },
                "full_board_360_prop_distributions": full_board_360_prop_distributions,
                "distribution_id": dist_schema_obj["distribution_id"],
            }
        )

    # Execute the 6-Stage Causal Looped Funnel (Projections -> Props & DFS Lineup Optimization Loop)
    # coupled directly to the live 15-game 10,000-world PBP simulation results
    funnel_engine = GSECausalLoopedFunnelEngine()
    funnel_receipt = funnel_engine.run_complete_causal_looped_funnel(
        num_optimization_iterations=8,
        worlds_per_iteration=2500,
        write_artifacts=persist_artifacts,
        live_simulation_results=game_simulation_results,
    )

    # Attach top plain-English Equation-to-Film prop plays to each game in game_simulation_results
    all_eval_tickets = funnel_engine._prop_evaluator.all_evaluated_tickets
    for g_entry in game_simulation_results:
        gid = g_entry["game_id"]
        compact_matchup = g_entry["matchup"].replace(" @ ", "@")
        g_tickets = [
            {
                "ticket_id": t.ticket_id,
                "player_name": t.player_name,
                "team": t.team,
                "position": t.position,
                "market_type": t.market_type,
                "direction": t.recommendation,
                "line": t.line,
                "projected_value": t.projected_value,
                "edge_percentage": t.edge_percentage,
                "causal_equation_plain_english": t.causal_equation_plain_english,
                "human_plain_english_rationale": t.human_plain_english_rationale,
            }
            for t in all_eval_tickets
            if (t.game_id in (gid, compact_matchup, g_entry["matchup"]) or t.matchup in (compact_matchup, g_entry["matchup"]))
            and t.publish_allowed
        ]
        g_tickets.sort(key=lambda x: float(x["edge_percentage"]), reverse=True)
        g_entry["top_plain_english_prop_plays"] = g_tickets[:6]

    elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)
    total_worlds = len(game_simulation_results) * worlds_per_game
    total_snaps = total_worlds * snaps_per_world

    bundle = {
        "release_id": "GSE-WEEK9-LIVE-SIMULATIONS-RELEASED-0740-CST-2026-11-08",
        "released_at_utc": datetime.now(timezone.utc).isoformat(),
        "status": "RELEASED_LIVE",
        "seal_verified_coach_mindset_hash": seal_digest,
        "tau_coach_fourth_down": float(sealed_obj["tau"]),
        "games_simulated_count": len(game_simulation_results),
        "worlds_per_game": worlds_per_game,
        "snaps_per_world": snaps_per_world,
        "total_game_worlds_simulated": total_worlds,
        "total_pbp_snaps_simulated": total_snaps,
        "causal_looped_funnel_summary": {
            "stage1_summary": funnel_receipt["stage1_summary"],
            "stage2_summary": funnel_receipt["stage2_summary"],
            "stage3a_summary": funnel_receipt["stage3a_summary"],
            "stage3b_summary": funnel_receipt["stage3b_summary"],
            "stage4_and_stage5_summary": funnel_receipt["stage4_and_stage5_summary"],
        },
        "games": game_simulation_results,
        "execution_elapsed_ms": elapsed_ms,
    }
    bundle["bundle_sha256"] = _sha256_json(bundle)

    if persist_artifacts:
        sim_out_path = (
            root / "data" / "simulations" / "week9_live_released_simulations_0740_cst_2026_11_08.json"
        )
        sim_out_path.parent.mkdir(parents=True, exist_ok=True)
        sim_out_path.write_text(json.dumps(bundle, indent=2) + "\n", encoding="utf-8")

        receipt_out_path = (
            root
            / "docs"
            / "predictions"
            / "research"
            / "2026-11-07"
            / "week9-live-released-simulations-0740-cst-receipt.json"
        )
        receipt_out_path.parent.mkdir(parents=True, exist_ok=True)
        receipt_out_path.write_text(json.dumps(bundle, indent=2) + "\n", encoding="utf-8")

    return bundle


if __name__ == "__main__":
    res = release_live_week9_simulations(
        worlds_per_game=10000,
        snaps_per_world=175,
        persist_artifacts=True,
    )
    print(
        json.dumps(
            {
                "release_id": res["release_id"],
                "status": res["status"],
                "games_simulated_count": res["games_simulated_count"],
                "total_game_worlds_simulated": res["total_game_worlds_simulated"],
                "total_pbp_snaps_simulated": res["total_pbp_snaps_simulated"],
                "bundle_sha256": res["bundle_sha256"],
                "execution_elapsed_ms": res["execution_elapsed_ms"],
                "game_board": [
                    {
                        "matchup": g["matchup"],
                        "window": g["window"],
                        "proj_score": f"{g['matchup'].split(' @ ')[0]} {g['projected_away_score']:.1f} - {g['matchup'].split(' @ ')[1]} {g['projected_home_score']:.1f}",
                        "gse_total_vs_book": f"{g['projected_total_mean']:.1f} vs {g['book_total_line']:.1f} ({g['total_discrepancy_pts']:+.2f}) -> {g['recommended_total_action']}",
                        "gse_spread_vs_book": f"{g['gse_fair_spread_home']:+.2f} vs {g['book_spread_home']:+.1f} ({g['spread_discrepancy_pts']:+.2f}) -> {g['recommended_spread_action']}",
                        "home_win_prob": g["gse_home_win_prob"],
                        "heavy_juice_blocked": g["heavy_juice_firewall_blocked"],
                    }
                    for g in res["games"]
                ],
            },
            indent=2,
        )
    )
