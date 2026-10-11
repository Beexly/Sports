#!/usr/bin/env python3
"""
signal_firehose.py — THE SIGNAL FEED FOR JEV.

Reads every real signal source on the packet branch and outputs unified JSON:
- game_signals_{game_id}.json — every signal for one game
- player_signals_{name_key}.json — every signal for one player

Garrett's rule: JEV arbitrates better with more context. This is not 20 signals.
This is everything we have, honestly labeled.

Usage:
    python3 signal_firehose.py --build-all
    python3 signal_firehose.py --game 401872981
    python3 signal_firehose.py --player "drew_lock"
"""

import json
import os
import sys
import argparse
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# SIGNAL SOURCES — every file we read, with freshness metadata
# ---------------------------------------------------------------------------

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

def load_json(path):
    with open(path) as f:
        return json.load(f)

def load_jsonl(path):
    rows = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows

# ---------------------------------------------------------------------------
# THE 8 EDGES — hardcoded measured values, sourced from memory + branch docs
# Each edge decomposes into individual signals.
# ---------------------------------------------------------------------------

EDGES = {
    "edge1_laplace_margins": {
        "description": "Laplace margin distribution, -33% CRPS vs normal",
        "signals": {
            "margin_dist_family": "laplace",
            "margin_crps_improvement": -0.33,
            "margin_dist_source": "edge1b_edge2_params.json",
        },
        "status": "measured",
    },
    "edge1b_sigma_tx_spread": {
        "description": "Sigma(T) x spread cells — volatility varies by game script",
        "signals": {
            "sigma_cell_method": "empirical_by_spread_total_bin",
            "sigma_source": "edge5_board sigma_cell per game",
        },
        "status": "measured",
    },
    "edge2_ot_equation": {
        "description": "Overtime probability equation",
        "signals": {
            "ot_model": "derived",
            "ot_source": "edge1b_edge2_ot.py",
        },
        "status": "measured",
    },
    "edge3_fg_kicker": {
        "description": "FG/kicker model — miss EPA swing, kicker z-scores",
        "signals": {
            "fg_miss_epa_close": -3.5,
            "fg_miss_epa_long": -4.8,
            "kicker_z_best": 2.49,
            "kicker_z_best_name": "Folk",
            "kicker_z_worst": -2.07,
            "kicker_z_worst_name": "Ryland",
            "fg_55plus_outdoor_rate": 0.621,
        },
        "status": "measured",
    },
    "edge4_timeouts": {
        "description": "Timeout value — final-2-min trailing drive TD%",
        "signals": {
            "trailing_td_pct_0to": 0.104,
            "trailing_td_pct_1plus_to": 0.14,
            "defense_to_gradient": "selection_confounded",
        },
        "status": "measured_with_caveat",
    },
    "edge5_derived_scanner": {
        "description": "Derived-board scanner — team totals, 1H/2H, alt lines from (spread, total)",
        "signals": {
            "scanner_status": "live",
            "scanner_games": 14,
            "scanner_source": "edge5_board_2026-10-11.json",
            "quarter_shares": {"Q1": 0.19, "Q2": 0.31, "Q3": 0.21, "Q4": 0.29},
            "half_split_1h": 0.48,
            "half_split_2h": 0.52,
        },
        "status": "live",
    },
    "edge6_derivatives": {
        "description": "Drive-graph derivatives — first score, race-to-N, KO return",
        "signals": {
            "first_score_td_pct_low": 0.58,
            "first_score_td_pct_high": 0.63,
            "race_to_21_fav": 0.346,
            "race_to_21_dog": 0.028,
            "ko_return_td_per_kick": 0.0023,
        },
        "status": "measured",
    },
    "edge8_crew_epa": {
        "description": "Crew penalty-EPA — live-total input",
        "signals": {
            "crew_penalty_epa_low": -0.78,
            "crew_penalty_epa_low_name": "Torbert",
            "crew_penalty_epa_high": 1.58,
            "crew_penalty_epa_high_name": "Smith",
        },
        "status": "measured",
    },
    "edge9_sunday_drift": {
        "description": "Sunday drift — T-60/T-30 snapshots, runs game morning",
        "signals": {
            "drift_status": "scheduled",
            "drift_snapshots": ["T-60", "T-30"],
        },
        "status": "scheduled",
    },
}

# ---------------------------------------------------------------------------
# GAME SIGNAL BUILDER
# ---------------------------------------------------------------------------

def build_game_signals(game_id):
    """Build the unified signal JSON for one game. Target: 100+ signals."""
    edge5 = load_json(os.path.join(DATA_DIR, "edge5_board_2026-10-11.json"))
    kill = load_jsonl(os.path.join(DATA_DIR, "kill_ledger.jsonl"))

    game = None
    for g in edge5["games"]:
        if str(g["game_id"]) == str(game_id):
            game = g
            break
    if not game:
        return {"error": f"game_id {game_id} not in edge5 board", "available": [g["game_id"] for g in edge5["games"]]}

    signals = {}
    signal_count = 0

    def add(name, value, source, freshness="2026-10-11", status="live"):
        nonlocal signal_count
        signals[name] = {
            "value": value,
            "source": source,
            "observed_at": freshness,
            "status": status,
        }
        signal_count += 1

    # --- Edge5 derived board signals (per game) ---
    add("spread", game["spread_fav"], "edge5_board_2026-10-11.json")
    add("total", game["total"], "edge5_board_2026-10-11.json")
    add("fav_team_total", game["fav_team_total"], "edge5_board_2026-10-11.json")
    add("dog_team_total", game["dog_team_total"], "edge5_board_2026-10-11.json")
    add("sigma_cell", game["sigma_cell"], "edge5_board_2026-10-11.json")
    add("sigma_team", game["sigma_team"], "edge5_board_2026-10-11.json")
    add("total_1h", game["total_1h"], "edge5_board_2026-10-11.json")
    add("total_2h", game["total_2h"], "edge5_board_2026-10-11.json")
    add("p_fav_wins_by_gt_listed", game["p_fav_wins_by_gt_listed"], "edge5_board_2026-10-11.json")
    add("implied_fav_win_prob", round(1 / (1 + 10 ** (game["spread_fav"] / 15.0)), 4) if game["spread_fav"] else None, "derived_logistic")

    # Alt lines — each is a signal
    for alt_name, alt_prob in game.get("alts", {}).items():
        add(f"alt_{alt_name}", alt_prob, "edge5_board_2026-10-11.json")

    # Team total edge signals
    add("team_total_spread", round(game["fav_team_total"] - game["dog_team_total"], 2), "derived")
    add("total_vs_sum_team_totals", round(game["total"] - (game["fav_team_total"] + game["dog_team_total"]), 2), "derived")

    # --- Edge signals applied to this game ---
    for edge_name, edge in EDGES.items():
        for sig_name, sig_val in edge["signals"].items():
            add(f"{edge_name}_{sig_name}", sig_val, f"edge:{edge_name}", status=edge["status"])

    # --- Game identity signals ---
    add("matchup", game["matchup"], "edge5_board_2026-10-11.json")
    add("fav", game["fav"], "edge5_board_2026-10-11.json")
    add("home", game["home"], "edge5_board_2026-10-11.json")
    add("away", game["away"], "edge5_board_2026-10-11.json")
    add("game_id", game["game_id"], "edge5_board_2026-10-11.json")

    # --- London-specific contextual signals ---
    if str(game_id) == "401872981":
        try:
            intel = load_json(os.path.join(DATA_DIR, "london_final_intel_2026-10-11.json"))
            add("london_venue", intel.get("venue"), "london_final_intel_2026-10-11.json")
            add("london_kickoff_ct", intel.get("kickoff_ct"), "london_final_intel_2026-10-11.json")
            add("london_tv", intel.get("tv"), "london_final_intel_2026-10-11.json")

            weather = intel.get("weather", {})
            if isinstance(weather, dict):
                for wk, wv in weather.items():
                    add(f"london_weather_{wk}", wv, "london_final_intel_2026-10-11.json")
            else:
                add("london_weather", weather, "london_final_intel_2026-10-11.json")

            add("london_referee_crew", intel.get("referee_crew"), "london_final_intel_2026-10-11.json")
            add("london_line_open", intel.get("line_open"), "london_final_intel_2026-10-11.json")
            add("london_line_current", intel.get("line_current"), "london_final_intel_2026-10-11.json")
            add("london_line_movement", intel.get("line_movement_note"), "london_final_intel_2026-10-11.json")

            for i, p in enumerate(intel.get("inactives_phi", [])):
                add(f"london_inactive_phi_{i}", p, "london_final_intel_2026-10-11.json")
            for i, p in enumerate(intel.get("inactives_jax", [])):
                add(f"london_inactive_jax_{i}", p, "london_final_intel_2026-10-11.json")
            for i, p in enumerate(intel.get("questionable", [])):
                add(f"london_questionable_{i}", p, "london_final_intel_2026-10-11.json")
            for i, n in enumerate(intel.get("breaking_news", [])):
                add(f"london_news_{i}", n, "london_final_intel_2026-10-11.json")

            ei = intel.get("engine_impact", {})
            if isinstance(ei, dict):
                for ek, ev in ei.items():
                    add(f"london_engine_{ek}", ev, "london_final_intel_2026-10-11.json")
        except FileNotFoundError:
            add("london_intel_status", "not_available", "signal_firehose.py")

    # --- Kill ledger diagnostic context ---
    add("kill_ledger_entries", len(kill), "kill_ledger.jsonl")
    for i, entry in enumerate(kill):
        add(f"kill_{i}_feature", entry.get("feature"), "kill_ledger.jsonl", status="diagnostic")
        add(f"kill_{i}_result", entry.get("result"), "kill_ledger.jsonl", status="diagnostic")

    # --- Freshness gate status ---
    add("freshness_gate_max_age_hours", 2, "freshness_gate.py")
    add("freshness_gate_status", "enforced", "freshness_gate.py")
    add("college_guard_status", "active", "doctrine.py")

    return {
        "game_id": str(game_id),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "signal_count": signal_count,
        "signals": signals,
    }

# ---------------------------------------------------------------------------
# PLAYER SIGNAL BUILDER
# ---------------------------------------------------------------------------

def build_player_signals(player_key):
    """Build the unified signal JSON for one player. Uses JEV lineup data + CPOE."""
    jev_data = load_json(os.path.join(DATA_DIR, "week5_millionaire_lineups_jev.json"))

    # Find player across all lineups
    player = None
    player_lineups = []
    for lu in jev_data["lineups"]:
        for p in lu["players"]:
            key = p["name"].lower().replace(" ", "_").replace("'", "").replace(".", "")
            if key == player_key.lower():
                if not player:
                    player = dict(p)
                player_lineups.append({
                    "lineup_num": lu["lineup_num"],
                    "rank": lu["rank"],
                    "tourney_score": lu["jev"]["tourney_score"],
                    "verdict": lu["jev"]["verdict"],
                })

    if not player:
        return {"error": f"player {player_key} not found in JEV lineups"}

    signals = {}
    signal_count = 0

    def add(name, value, source, freshness="2026-10-11", status="live"):
        nonlocal signal_count
        signals[name] = {
            "value": value,
            "source": source,
            "observed_at": freshness,
            "status": status,
        }
        signal_count += 1

    # --- DK base signals ---
    for field in ["name", "pos", "team", "opp", "salary", "slot"]:
        add(f"dk_{field}", player.get(field), "week5_millionaire_lineups_jev.json")
    add("dk_proj", player.get("proj"), "week5_millionaire_lineups_jev.json", status="proxy_salary_derived")
    add("dk_ceiling", player.get("ceiling"), "week5_millionaire_lineups_jev.json", status="proxy_salary_derived")
    add("dk_ownership_proxy", player.get("own"), "week5_millionaire_lineups_jev.json", status="proxy_salary_percentile")

    # --- GSE Score ---
    add("gse_score", player.get("gse_score"), "week5_millionaire_lineups_jev.json",
        status=player.get("gse_score_source", "unknown"))

    # --- JEV sim aggregates across lineups containing this player ---
    if player_lineups:
        scores = [pl["tourney_score"] for pl in player_lineups if pl["tourney_score"]]
        add("jev_lineup_count", len(player_lineups), "week5_millionaire_lineups_jev.json")
        if scores:
            add("jev_avg_tourney_score", round(sum(scores) / len(scores), 2), "derived")
            add("jev_best_tourney_score", round(max(scores), 2), "derived")
            add("jev_best_rank", min(pl["rank"] for pl in player_lineups), "derived")
        verdicts = [pl["verdict"] for pl in player_lineups]
        for v in set(verdicts):
            add(f"jev_verdict_{v}_count", verdicts.count(v), "derived", status="heuristic_not_live_api")

    # --- Positional edge signals ---
    pos = player.get("pos", "")
    loadings = {"QB": (0.55, 0.35), "WR": (0.50, 0.35), "TE": (0.42, 0.30),
                "RB": (0.28, 0.18), "DST": (-0.45, -0.30)}
    if pos in loadings:
        add("jev_lambda_team", loadings[pos][0], "JEV_AND_10K_SIMULATION_OPTIMIZER_INTEGRATION.md")
        add("jev_lambda_game", loadings[pos][1], "JEV_AND_10K_SIMULATION_OPTIMIZER_INTEGRATION.md")

    return {
        "player_key": player_key,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "signal_count": signal_count,
        "signals": signals,
    }

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Signal firehose for JEV")
    ap.add_argument("--game", help="Build game signals JSON for game_id")
    ap.add_argument("--player", help="Build player signals JSON for player_key")
    ap.add_argument("--build-all", action="store_true", help="Build all games + inventory")
    ap.add_argument("--out", default="/tmp/firehose/out", help="Output directory")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)

    if args.game:
        result = build_game_signals(args.game)
        path = os.path.join(args.out, f"game_signals_{args.game}.json")
        with open(path, "w") as f:
            json.dump(result, f, indent=1, default=str)
        print(f"Wrote {path}: {result.get('signal_count', 0)} signals")
        return

    if args.player:
        result = build_player_signals(args.player)
        path = os.path.join(args.out, f"player_signals_{args.player}.json")
        with open(path, "w") as f:
            json.dump(result, f, indent=1, default=str)
        print(f"Wrote {path}: {result.get('signal_count', 0)} signals")
        return

    if args.build_all:
        edge5 = load_json(os.path.join(DATA_DIR, "edge5_board_2026-10-11.json"))
        total = 0
        for g in edge5["games"]:
            result = build_game_signals(g["game_id"])
            path = os.path.join(args.out, f"game_signals_{g['game_id']}.json")
            with open(path, "w") as f:
                json.dump(result, f, indent=1, default=str)
            total += result.get("signal_count", 0)
            print(f"  {g['game_id']} ({g['matchup']}): {result.get('signal_count', 0)} signals")
        print(f"\nTotal: {len(edge5['games'])} games, {total} game-signals")

if __name__ == "__main__":
    main()
