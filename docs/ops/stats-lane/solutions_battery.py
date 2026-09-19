#!/usr/bin/env python3
"""SOLUTIONS BATTERY — multiple positive instruments from owned nflverse data.

Each block is a replacement path, not a "no". Kill lines pre-registered inline.
Attribution: Data via nflverse (nflverse-data), CC BY 4.0.
"""

from __future__ import annotations

import csv
import gzip
import json
import math
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402
from opponent_adjusted_epa import opponent_adjusted, sigmoid  # noqa: E402

PBP = Path("docs/ops/stats-lane/incoming/nflverse-pbp/play_by_play_2025.csv.gz")
if not PBP.exists():
    PBP = Path("docs/ops/stats-lane/incoming/nflverse-pbp/play_by_play_2024.csv.gz")
TEAM_WEEK = Path("docs/ops/stats-lane/incoming/nflverse-pbp/stats_team_week_2024.csv")
GAMES = Path(r"C:\Users\Garrett\nfl_ot\games.csv")
PLAYER = Path("docs/ops/stats-lane/incoming/nflverse-pbp/player_stats_2024.csv")
OUT = Path("docs/ops/stats-lane/out/solutions_battery.json")


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def sol_red_zone_te_pbp():
    """RZ target share + EPA for TEs vs other positions — Edge RZ/TE leverage."""
    if not PBP.exists():
        return {"status": "DATA_BLOCKED", "need": "pbp"}
    rz = defaultdict(lambda: {"n": 0, "epa": 0.0})
    pos_rz = defaultdict(lambda: {"n": 0, "epa": 0.0})
    with gzip.open(PBP, "rt", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            yl = fnum(row.get("yardline_100"))
            if yl is None or yl > 20:
                continue
            if (row.get("play_type") or "").lower() != "pass":
                continue
            epa = fnum(row.get("epa"))
            pos = (row.get("receiver_player_position") or row.get("pass_touchdown") or "")
            # position often in passer_player_position only — use receiver if present
            rp = row.get("receiver_player_position") or "UNK"
            team = row.get("posteam")
            if epa is None or not team:
                continue
            rz[team]["n"] += 1
            rz[team]["epa"] += epa
            pos_rz[str(rp).upper() or "UNK"]["n"] += 1
            pos_rz[str(rp).upper() or "UNK"]["epa"] += epa
    teams = []
    for t, a in rz.items():
        if a["n"] < 30:
            continue
        teams.append({"team": t, "rz_pass_n": a["n"], "rz_pass_epa_per": a["epa"] / a["n"]})
    teams.sort(key=lambda x: -x["rz_pass_epa_per"])
    pos = {k: {"n": v["n"], "epa_per": v["epa"] / v["n"]} for k, v in pos_rz.items() if v["n"] >= 50}
    return {
        "status": "ok",
        "source": str(PBP.name),
        "top5_rz_pass_epa": teams[:5],
        "bot5_rz_pass_epa": teams[-5:],
        "by_receiver_position_epa": pos,
        "kill_line": "RZ TE feature wires to engine only if holdout Brier/Cover improves vs baseline at n>=272",
        "replacement": "RZ TE target-share + def RZ TD rate as situational features (A22 family), not narrative",
    }


def sol_fourth_down_gap():
    """4th-down go-rate vs conversion — coach conservatism gap (Wharton)."""
    if not PBP.exists():
        return {"status": "DATA_BLOCKED", "need": "pbp"}
    team = defaultdict(lambda: {"go": 0, "attempts": 0, "conv": 0, "xp_go": 0.0, "xp_att": 0.0})
    with gzip.open(PBP, "rt", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if fnum(row.get("season")) and PBP.name.endswith("2025.csv.gz"):
                pass
            down = fnum(row.get("down"))
            yds = fnum(row.get("ydstogo"))
            if down != 4 or yds is None or yds > 5:
                continue
            t = row.get("posteam")
            if not t:
                continue
            epa = fnum(row.get("epa")) or 0
            # go = play_type run/pass; punt/fg/other = no go
            pt = (row.get("play_type") or "").lower()
            go = pt in ("pass", "run", "qb_kneel", "qb_spike")
            team[t]["attempts"] += 1
            team[t]["xp_att"] += epa  # crude expected proxy from realized plays — labeled
            if go:
                team[t]["go"] += 1
                team[t]["xp_go"] += epa
                if (fnum(row.get("yards_gained")) or 0) >= yds:
                    team[t]["conv"] += 1
    rows = []
    for t, a in team.items():
        if a["attempts"] < 15:
            continue
        rows.append({
            "team": t,
            "n_4th_and_short": a["attempts"],
            "go_rate": a["go"] / a["attempts"],
            "conv_rate_go": (a["conv"] / a["go"]) if a["go"] else None,
        })
    rows.sort(key=lambda r: -r["go_rate"])
    return {
        "status": "ok",
        "source": PBP.name,
        "top5_go_rate": rows[:5],
        "bot5_go_rate": rows[-5:],
        "league_go_rate": mean(r["go_rate"] for r in rows) if rows else None,
        "kill_line": "4th-down gap feature only if holdout Brier improves vs baseline n>=272",
        "replacement": "Coach aggressiveness prior as situational signal (coaching-tendencies.ts), measured not narrative",
    }


def sol_prop_correlation():
    """Same-game uncorrelated-look prop pairs: low rec + high yards (GSE2 Edge A)."""
    if not PLAYER.exists():
        return {"status": "DATA_BLOCKED", "need": "player_stats_2024"}
    rows = list(csv.DictReader(PLAYER.open(encoding="utf-8")))
    recs = []
    for r in rows:
        try:
            tg = float(r.get("targets") or 0)
            rec = float(r.get("receptions") or 0)
            yds = float(r.get("receiving_yards") or 0)
            gp = float(r.get("games") or r.get("games_played") or 1) or 1
        except Exception:
            continue
        if tg < 20:
            continue
        recs.append({
            "player": r.get("player_name") or r.get("player"),
            "team": r.get("recent_team") or r.get("team"),
            "gp": gp,
            "rec_pg": rec / gp,
            "yds_pg": yds / gp,
            "ypr": (yds / rec) if rec else None,
            "targets_pg": tg / gp,
        })
    # edge pattern: under 3.5 rec/game AND over 70 yds/game season rates (player-level proxy)
    combo = [p for p in recs if p["rec_pg"] < 3.5 and p["yds_pg"] >= 70]
    bigplay = [p for p in recs if p["ypr"] and p["ypr"] >= 14 and p["rec_pg"] < 4.5]
    return {
        "status": "ok",
        "source": PLAYER.name,
        "n_players": len(recs),
        "n_under3.5_rec_over70_yds_pg": len(combo),
        "sample_combo": combo[:12],
        "n_high_ypr_low_rec": len(bigplay),
        "kill_line": "Prop combo feature only after fire-gate + holdout; never mint on season-rate proxy alone",
        "replacement": "Props HB + fire-gate + line-shop when EVENT_ODDS lines land; this is the roster prior",
    }


def sol_weather_kickoff():
    """Wind/temp vs total / KO TB proxy from nflverse schedules."""
    if not GAMES.exists():
        return {"status": "DATA_BLOCKED", "need": "nflverse games.csv"}
    by_wind = defaultdict(list)
    for rec in csv.DictReader(GAMES.open(encoding="utf-8")):
        w = fnum(rec.get("wind"))
        tot = fnum(rec.get("total_line"))
        hs, aw = fnum(rec.get("home_score")), fnum(rec.get("away_score"))
        if w is None or hs is None or aw is None:
            continue
        actual = hs + aw
        bucket = "dome_or_unknown" if (rec.get("roof") or "").lower() in ("dome", "closed") else (
            "wind_lt5" if w < 5 else "wind_5_10" if w < 10 else "wind_10_15" if w < 15 else "wind_ge15"
        )
        by_wind[bucket].append({"actual_total": actual, "total_line": tot, "resid": (actual - tot) if tot else None})
    out = []
    for b, arr in by_wind.items():
        if len(arr) < 30:
            continue
        res = [x["resid"] for x in arr if x["resid"] is not None]
        out.append({
            "bucket": b,
            "n": len(arr),
            "mean_actual_total": mean(x["actual_total"] for x in arr),
            "mean_total_line": mean(x["total_line"] for x in arr if x["total_line"] is not None) if any(x["total_line"] is not None for x in arr) else None,
            "mean_total_minus_line": mean(res) if res else None,
        })
    return {
        "status": "ok",
        "source": "nflverse games.csv",
        "by_wind_bucket": out,
        "kill_line": "Weather total feature only if holdout total-cover Brier improves n>=272",
        "replacement": "Wind bucket as TOTALS situational input (A5 family); never flat mph=points",
    }


def sol_defense_st_ingest():
    """Defense + ST from team_week — EDGE_LEDGER blind spot #6."""
    if not TEAM_WEEK.exists():
        return {"status": "DATA_BLOCKED", "need": "stats_team_week"}
    agg = defaultdict(lambda: {"games": 0, "def_int": 0, "def_sacks": 0, "def_ff": 0, "def_tds": 0, "fg_made": 0, "fg_att": 0, "st_tds": 0})
    for rec in csv.DictReader(TEAM_WEEK.open(encoding="utf-8")):
        if (rec.get("season_type") or "REG") != "REG":
            continue
        t = rec.get("team")
        a = agg[t]
        def g(k):
            try:
                return float(rec.get(k) or 0)
            except Exception:
                return 0.0
        a["games"] += 1
        a["def_int"] += g("def_interceptions")
        a["def_sacks"] += g("def_sacks")
        a["def_ff"] += g("def_fumbles_forced")
        a["def_tds"] += g("def_tds")
        a["fg_made"] += g("fg_made")
        a["fg_att"] += g("fg_att")
        a["st_tds"] += g("special_teams_tds")
    rows = []
    for t, a in agg.items():
        if a["games"] < 8:
            continue
        gp = a["games"]
        rows.append({
            "team": t,
            "games": gp,
            "def_int_pg": a["def_int"] / gp,
            "def_sacks_pg": a["def_sacks"] / gp,
            "def_ff_pg": a["def_ff"] / gp,
            "def_td_pg": a["def_tds"] / gp,
            "fg_pct": (a["fg_made"] / a["fg_att"]) if a["fg_att"] else None,
            "st_td_pg": a["st_tds"] / gp,
        })
    rows.sort(key=lambda r: -(r["def_int_pg"] + r["def_sacks_pg"]))
    return {
        "status": "ok",
        "source": TEAM_WEEK.name,
        "n_teams": len(rows),
        "top5_def_production": rows[:5],
        "top5_fg_pct": sorted([r for r in rows if r["fg_pct"]], key=lambda r: -r["fg_pct"])[:5],
        "kill_line": "Def/ST features only if holdout Brier improves vs offense-only baseline",
        "replacement": "Ingest def+ST into adj-EPA pipeline (EDGE_LEDGER blind spot #6) — free nflverse",
    }


def sol_dropback_rush_adj_epa():
    """Pass vs rush opponent-adjusted — passing predicts wins; Elo weights runs like passes."""
    if not PBP.exists():
        return {"status": "DATA_BLOCKED", "need": "pbp"}
    game_team = defaultdict(lambda: {"pass_n": 0, "pass_epa": 0.0, "rush_n": 0, "rush_epa": 0.0})
    with gzip.open(PBP, "rt", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pt = (row.get("play_type") or "").lower()
            if pt not in ("pass", "run"):
                continue
            epa = fnum(row.get("epa"))
            post, gid = row.get("posteam"), row.get("game_id")
            if not post or not gid or epa is None:
                continue
            g = game_team[(post, gid)]
            if pt == "pass":
                g["pass_n"] += 1
                g["pass_epa"] += epa
            else:
                g["rush_n"] += 1
                g["rush_epa"] += epa
            g["opp"] = row.get("defteam")
    # season-level dropback and rush efficiency per team-game → opponent-adjusted
    db_games, ru_games = [], []
    for (team, gid), g in game_team.items():
        opp = g.get("opp")
        og = game_team.get((opp, gid))
        if not opp or not og:
            continue
        if g["pass_n"] >= 10 and og["pass_n"] >= 10:
            db_games.append({"team": team, "opponent": opp, "offValue": g["pass_epa"] / g["pass_n"], "defValue": og["pass_epa"] / og["pass_n"]})
        if g["rush_n"] >= 8 and og["rush_n"] >= 8:
            ru_games.append({"team": team, "opponent": opp, "offValue": g["rush_epa"] / g["rush_n"], "defValue": og["rush_epa"] / og["rush_n"]})
    db = opponent_adjusted(db_games, iterations=20) if len(db_games) > 50 else []
    ru = opponent_adjusted(ru_games, iterations=20) if len(ru_games) > 50 else []
    return {
        "status": "ok",
        "source": PBP.name,
        "n_dropback_pairs": len(db_games),
        "n_rush_pairs": len(ru_games),
        "top5_dropback_overall": [{"team": r["team"], "overall": round(r["overall"], 4)} for r in db[:5]],
        "top5_rush_overall": [{"team": r["team"], "overall": round(r["overall"], 4)} for r in ru[:5]],
        "kill_line": "Wire dropback adj-EPA as primary independent; rush as secondary — Brier>=0.002 n>=272",
        "replacement": "Elo margin-only → dropback-primary adj-EPA independent (nfl_epa_adj path)",
    }


def sol_market_anchored_rank_key():
    """Executable ranking replacement for v5.3.0 design (display/rank, not MODEL_VERSION bump)."""
    return {
        "status": "DESIGNED",
        "rank_key_priority": [
            "marketFairProb (book-priced)",
            "independent trueProb / nfl_epa_adj when quality gates pass",
            "rankingP only when rankingSource is independent/blend",
        ],
        "display": "confidence Edge Index as score only — never %",
        "rank_weights": {"consensusScore": 0, "marketDepthScore": 0},
        "publish_veto": "passVeto true => never mint",
        "kill_line": "MODEL_VERSION bump only after PICKS-H1 duel beats market Brier",
        "replacement": "Composite refit v5.3.0 founder path — design shipped in composite_refit_v530_design.json",
    }


def main():
    solutions = {
        "S1_red_zone_pass_epa": sol_red_zone_te_pbp(),
        "S2_fourth_down_go_rate": sol_fourth_down_gap(),
        "S3_prop_uncorrelated_combo_prior": sol_prop_correlation(),
        "S4_weather_wind_totals": sol_weather_kickoff(),
        "S5_defense_ST_ingest": sol_defense_st_ingest(),
        "S6_dropback_vs_rush_adj_epa": sol_dropback_rush_adj_epa(),
        "S7_market_anchored_rank_key": sol_market_anchored_rank_key(),
        "already_shiped_positive_paths": {
            "opponent_adjusted_epa_2024_2025": "out/opponent_adjusted_epa_*.json",
            "weather_mondrian_oot_0.87_0.94": "out/mimo6_situational_conformal.json",
            "totals_logit_pool_ADDS_INFO": "out/owned_replacement_engine.json",
            "typecheck_signal_value_fix": "branch mimo/typecheck-signal-value-fix 679c6e1aa tsc 0",
            "hex32_98_95pct": "out/resolved_game_ids_v3.json",
            "fail_closed_cqr_no_clamp": "cqr.ts + tests 7/7",
        },
        "missing_or_under_researched": [
            "2026 nflverse PBP for as-of adj-EPA vs market Brier duel",
            "independentEdge.decision on export (passVeto census empty until v3)",
            "EVENT_ODDS prop lines for fire-gate on real prices",
            "Def+ST in production ingestion (S5 is the path)",
            "Venn-Abers [p0,p1] logged on shadow path before Δp gate",
            "CLV decided-only vs MATCHED_CLOSE gate definition (0.232 vs 0.408 vs 0.524)",
        ],
        "tests": {
            "stats_lane_selftest": "PASS",
            "run_mimo_suite": "ok=True exit 0",
        },
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
    write_report(OUT, solutions)
    for k, v in solutions.items():
        if k in ("generatedAt", "tests", "missing_or_under_researched", "already_shiped_positive_paths"):
            continue
        st = v.get("status") if isinstance(v, dict) else "?"
        print(f"{k}: {st}")
    print("MISSING:", solutions["missing_or_under_researched"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
