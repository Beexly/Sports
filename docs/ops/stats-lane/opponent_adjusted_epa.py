#!/usr/bin/env python3
"""Opponent-adjusted EPA/play — the #1 structural upgrade named in the 38/100 audit.

Ports GSE2 opponent-adjusted.ts (iterative offense/defense net-out) onto nflverse
team-week or play-by-play. Output: team ratings + fair p_home via nfl-epa-fair-value
convention (HFA=0.025, scale=0.12, minGames=4).

Attribution: Data via nflverse (nflverse-data), CC BY 4.0.
Kill line (pre-registered): adj EPA model must beat Elo/market on held-out NFL
Brier by >=0.002 at n>=272 or it stays research-only — do not wire to mint path.
"""

from __future__ import annotations

import argparse
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


def sigmoid(margin, scale=0.12):
    return 1.0 / (1.0 + math.exp(-margin / scale))


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def opponent_adjusted(games, iterations=25):
    """games: list of {team, opponent, offValue, defValue} — port of opponent-adjusted.ts."""
    if not games:
        return []
    league_off = mean(g["offValue"] for g in games)
    league_def = mean(g["defValue"] for g in games)
    teams = set()
    by = defaultdict(list)
    for g in games:
        teams.add(g["team"])
        by[g["team"]].append(g)
    adj_off = {t: mean(g["offValue"] for g in by[t]) for t in teams}
    adj_def = {t: mean(g["defValue"] for g in by[t]) for t in teams}
    for _ in range(iterations):
        next_off, next_def = {}, {}
        for t in teams:
            gs = by[t]
            next_off[t] = mean(
                g["offValue"] - ((adj_def.get(g["opponent"], league_def)) - league_def)
                for g in gs
            )
            next_def[t] = mean(
                g["defValue"] - ((adj_off.get(g["opponent"], league_off)) - league_off)
                for g in gs
            )
        adj_off, adj_def = next_off, next_def
    out = []
    for t in teams:
        gs = by[t]
        ao, ad = adj_off[t], adj_def[t]
        out.append(
            {
                "team": t,
                "games": len(gs),
                "raw_off": mean(g["offValue"] for g in gs),
                "raw_def": mean(g["defValue"] for g in gs),
                "adj_off": ao,
                "adj_def": ad,
                "overall": ao - ad,
            }
        )
    out.sort(key=lambda r: -r["overall"])
    return out


def load_team_week(path):
    """Build TeamGameEfficiency from stats_team_week: off = (pass_epa+rush_epa)/plays;
    defValue = opponent's off when they played us (efficiency allowed)."""
    rows = list(csv.DictReader(path.open(encoding="utf-8")))
    games = []
    by_game = defaultdict(dict)
    for r in rows:
        if (r.get("season_type") or "REG") != "REG":
            continue
        att = fnum(r.get("attempts")) or 0
        car = fnum(r.get("carries")) or 0
        pepa = fnum(r.get("passing_epa")) or 0.0
        repa = fnum(r.get("rushing_epa")) or 0.0
        plays = att + car
        if plays < 10:
            continue
        off = (pepa + repa) / plays
        team, opp = r.get("team"), r.get("opponent_team")
        gid, wk = r.get("game_id"), r.get("week")
        by_game[(gid, wk, team)] = {"team": team, "opponent": opp, "offValue": off, "game_id": gid, "week": wk}
    # defValue = opponent's offValue in same game
    for (gid, wk, team), rec in by_game.items():
        opp_rec = by_game.get((gid, wk, rec["opponent"]))
        if not opp_rec:
            continue
        rec["defValue"] = opp_rec["offValue"]  # efficiency we allowed
        games.append(rec)
    return games


def load_pbp_reg(path_gz, season=2024):
    """Play-level EPA by team — off EPA/play, def EPA allowed/play, split pass/rush."""
    off_plays = defaultdict(lambda: {"pass_n": 0, "pass_epa": 0.0, "rush_n": 0, "rush_epa": 0.0, "n": 0, "epa": 0.0, "opp": None, "week": None})
    # need opponent: read defteam as opponent of posteam
    import io
    with gzip.open(path_gz, "rt", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if fnum(row.get("season")) != season:
                continue
            st = (row.get("season_type") or row.get("game_type") or "REG").upper()
            if st not in ("REG", "R"):
                continue
            pt = (row.get("play_type") or "").lower()
            epa = fnum(row.get("epa"))
            post = row.get("posteam")
            defe = row.get("defteam")
            if not post or not defe or epa is None:
                continue
            # exclude kneels/spikes roughly
            if pt not in ("pass", "run", "qb_kneel", "qb_spike"):
                continue
            if pt in ("qb_kneel", "qb_spike"):
                continue
            key = post
            g = off_plays[key]
            g["n"] += 1
            g["epa"] += epa
            g["opp"] = defe
            g["week"] = row.get("week")
            if pt == "pass":
                g["pass_n"] += 1
                g["pass_epa"] += epa
            elif pt == "run":
                g["rush_n"] += 1
                g["rush_epa"] += epa
            # accumulate def-side allowed
            d = off_plays[defe]  # reuse structure: we'll store def separately
    # rebuild properly with game-level if possible — season aggregate per team-opponent is weak
    # Use team-season off as offValue per opponent via game_id grouping
    return None  # handled in load_pbp_games


def load_pbp_games(path_gz, season=2024):
    """Per (team, game_id): off EPA/play, def EPA allowed/play from opponent offense."""
    game_team = defaultdict(lambda: {"epa": 0.0, "n": 0, "pass_epa": 0.0, "pass_n": 0, "rush_epa": 0.0, "rush_n": 0})
    with gzip.open(path_gz, "rt", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if fnum(row.get("season")) != season:
                continue
            st = (row.get("season_type") or "REG").upper()
            if st not in ("REG", "R"):
                continue
            pt = (row.get("play_type") or "").lower()
            if pt not in ("pass", "run"):
                continue
            epa = fnum(row.get("epa"))
            post, defe, gid = row.get("posteam"), row.get("defteam"), row.get("game_id")
            if not post or not defe or not gid or epa is None:
                continue
            k = (post, gid)
            g = game_team[k]
            g["n"] += 1
            g["epa"] += epa
            g["opp"] = defe
            g["week"] = row.get("week")
            if pt == "pass":
                g["pass_n"] += 1
                g["pass_epa"] += epa
            else:
                g["rush_n"] += 1
                g["rush_epa"] += epa
    games = []
    for (team, gid), g in game_team.items():
        if g["n"] < 20:
            continue
        opp = g.get("opp")
        if not opp:
            continue
        og = game_team.get((opp, gid))
        if not og or og["n"] < 20:
            continue
        off = g["epa"] / g["n"]
        # defValue = opponent offensive EPA/play in this game = what we allowed
        def_v = og["epa"] / og["n"]
        games.append(
            {
                "team": team,
                "opponent": opp,
                "offValue": off,
                "defValue": def_v,
                "game_id": gid,
                "week": g.get("week"),
                "plays": g["n"],
                "dropback_epa_per": (g["pass_epa"] / g["pass_n"]) if g["pass_n"] else None,
                "rush_epa_per": (g["rush_epa"] / g["rush_n"]) if g["rush_n"] else None,
            }
        )
    return games


def fair_p(home_overall, away_overall, hfa=0.025, scale=0.12):
    margin = home_overall - away_overall + hfa
    ph = sigmoid(margin, scale)
    eps = 1e-6
    ph = min(1 - eps, max(eps, ph))
    return {"pHome": ph, "pAway": 1 - ph, "margin_epa": margin}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pbp", default="")
    ap.add_argument("--team-week", default="")
    ap.add_argument("--out", required=True)
    ap.add_argument("--season", type=int, default=2024)
    args = ap.parse_args()

    games = []
    source = None
    if args.pbp and Path(args.pbp).exists():
        games = load_pbp_games(Path(args.pbp), args.season)
        source = f"pbp_{args.season}"
    elif args.team_week and Path(args.team_week).exists():
        games = load_team_week(Path(args.team_week))
        source = f"stats_team_week_{args.season}"
    if not games:
        write_report(Path(args.out), {"ok": False, "status": "DATA_BLOCKED", "need": "nflverse pbp or stats_team_week"})
        return 2

    ratings = opponent_adjusted(games, iterations=25)
    # split dropback/rush opponent-adjusted if available
    pbp_games = games
    dropback_games = [
        {**g, "offValue": g["dropback_epa_per"], "defValue": None} for g in pbp_games if g.get("dropback_epa_per") is not None
    ]
    # dropback def: use opponent dropback when present
    by_pair = {(g["team"], g["game_id"]): g for g in pbp_games}
    db_eff = []
    for g in pbp_games:
        if g.get("dropback_epa_per") is None:
            continue
        og = by_pair.get((g["opponent"], g["game_id"]))
        if not og or og.get("dropback_epa_per") is None:
            continue
        db_eff.append({"team": g["team"], "opponent": g["opponent"], "offValue": g["dropback_epa_per"], "defValue": og["dropback_epa_per"]})
    dropback_ratings = opponent_adjusted(db_eff, iterations=25) if len(db_eff) > 100 else []

    report = {
        "ok": True,
        "source": source,
        "season": args.season,
        "n_games_pairs": len(games),
        "attribution": "Data via nflverse (nflverse-data), CC BY 4.0",
        "method": "opponent-adjusted.ts iterative net-out; off=offEPA/plays; def=opp off EPA/play allowed",
        "fair_value_convention": {"hfa": 0.025, "scale": 0.12, "source_id": "nfl_epa_adj", "min_games": 4},
        "kill_line": "Wire to mint only if adj-EPA beats Elo/market Brier by >=0.002 on n>=272 held-out NFL",
        "ratings_overall": [{k: (round(v, 4) if isinstance(v, float) else v) for k, v in r.items()} for r in ratings],
        "ratings_dropback_adj": [{k: (round(v, 4) if isinstance(v, float) else v) for k, v in r.items()} for r in dropback_ratings[:32]],
        "example_fair": None,
    }
    if len(ratings) >= 2:
        top, bot = ratings[0], ratings[-1]
        report["example_fair"] = {
            "home": top["team"],
            "away": bot["team"],
            **fair_p(top["overall"], bot["overall"]),
        }
        report["league_spread_overall"] = ratings[0]["overall"] - ratings[-1]["overall"]
    write_report(Path(args.out), report)
    print(
        dumps_report(
            {
                "ok": True,
                "out": str(args.out),
                "source": source,
                "n_pairs": len(games),
                "top5": [(r["team"], round(r["overall"], 4)) for r in ratings[:5]],
                "bot3": [(r["team"], round(r["overall"], 4)) for r in ratings[-3:]],
                "example_fair": report.get("example_fair"),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
