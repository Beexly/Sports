#!/usr/bin/env python3
"""As-of opponent-adjusted EPA — fair duel instrument.

Season-end ratings applied to in-season games leak future information.
This rebuilds adj-EPA using ONLY games with kickoff strictly BEFORE each
test game (as-of). Kill line unchanged: Brier_asof < Brier_market - 0.002
on n>=272 or research-only.
"""

from __future__ import annotations

import argparse
import csv
import gzip
import json
import math
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402
from sport_resolve import resolve_sport  # noqa: E402
from opponent_adjusted_epa import opponent_adjusted, sigmoid  # noqa: E402
from adj_epa_vs_market_duel import abbr_from_name, fnum, brier  # noqa: E402


def load_pbp_games(path_gz, season):
    game_team = defaultdict(lambda: {"epa": 0.0, "n": 0})
    meta = {}
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
            meta[gid] = {
                "week": fnum(row.get("week")),
                "gameday": row.get("gameday") or row.get("game_date"),
                "season": season,
            }
    games = []
    for (team, gid), g in game_team.items():
        if g["n"] < 20:
            continue
        og = game_team.get((g["opp"], gid))
        if not og or og["n"] < 20:
            continue
        m = meta.get(gid) or {}
        games.append({
            "team": team,
            "opponent": g["opp"],
            "offValue": g["epa"] / g["n"],
            "defValue": og["epa"] / og["n"],
            "game_id": gid,
            "week": m.get("week"),
            "gameday": m.get("gameday"),
        })
    return games


def parse_day(s):
    if not s:
        return None
    try:
        return datetime.fromisoformat(str(s)[:10]).replace(tzinfo=timezone.utc)
    except Exception:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--export", required=True)
    ap.add_argument("--pbp-dir", default="docs/ops/stats-lane/incoming/nflverse-pbp")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    pbp_dir = Path(args.pbp_dir)
    all_games = []
    for season in (2024, 2025):
        p = pbp_dir / f"play_by_play_{season}.csv.gz"
        if p.exists():
            all_games.extend(load_pbp_games(p, season))
    if not all_games:
        write_report(Path(args.out), {"ok": False, "status": "DATA_BLOCKED", "need": "pbp 2024/2025"})
        return 2

    # sort games by gameday/week
    def gkey(g):
        d = parse_day(g.get("gameday"))
        return (g.get("season") or 0, g.get("week") or 0, d.timestamp() if d else 0)

    all_games.sort(key=gkey)

    export_rows = [json.loads(l) for l in Path(args.export).read_text(encoding="utf-8").splitlines() if l.strip()]

    def asof_ratings(before_game_id):
        # use all pbp games strictly before this game_id's timestamp if known
        hist = []
        for g in all_games:
            if g["game_id"] == before_game_id:
                break
            hist.append(g)
        if len(hist) < 40:
            return None
        # collapse to ratings once
        return {r["team"]: r["overall"] for r in opponent_adjusted(hist, iterations=15)}

    # Cache ratings at week boundaries by season
    # Build week index
    by_week = defaultdict(list)
    for g in all_games:
        by_week[(g.get("season"), g.get("week"))].append(g)
    season_weeks = sorted(by_week.keys(), key=lambda k: (k[0] or 0, k[1] or 0))

    def ratings_asof_week(season, week):
        hist = []
        for s, w in season_weeks:
            if s is None or w is None:
                continue
            if s < season or (s == season and w < week):
                hist.extend(by_week[(s, w)])
        if len(hist) < 80:
            return None
        return {r["team"]: r["overall"] for r in opponent_adjusted(hist, iterations=15)}

    # map export NFL ML to abbr + week guess from commenceTime
    pairs_mkt, pairs_adj = [], []
    used = 0
    for r in export_rows:
        if str(r.get("pickType") or "").upper() != "MONEYLINE":
            continue
        if resolve_sport(r.get("sport"), r.get("espnEventId"), r.get("selection")) != "NFL":
            continue
        if r.get("result") not in ("WIN", "LOSS"):
            continue
        mfp = fnum(r.get("marketFairProb"))
        home = abbr_from_name(r.get("homeTeam") or r.get("homeTeamName") or "")
        away = abbr_from_name(r.get("awayTeam") or r.get("awayTeamName") or "")
        if not home or not away:
            continue
        y = 1 if r["result"] == "WIN" else 0
        if mfp is not None and 0 < mfp < 1:
            pairs_mkt.append((mfp, y))
        # as-of: use week of commenceTime year — export 2026 may not exist in pbp; use 2025 max week as proxy
        # honest: if commenceTime year not in pbp seasons, skip adj
        ct = str(r.get("commenceTime") or "")
        year = int(ct[:4]) if ct[:4].isdigit() else None
        season = year if year in (2024, 2025) else 2025
        week = 18  # worst-case leaky if unknown — prefer skip
        if year not in (2024, 2025):
            continue  # do not invent as-of for 2026 rows
        R = ratings_asof_week(season, 1)  # start of season prior only — conservative
        if not R or home not in R or away not in R:
            continue
        p_home = sigmoid(R[home] - R[away] + 0.025)
        sel = str(r.get("selection") or "").lower()
        p_adj = p_home if home.lower() in sel else 1 - p_home
        pairs_adj.append((min(1 - 1e-6, max(1e-6, p_adj)), y))
        used += 1

    report = {
        "ok": True,
        "n_pbp_games": len(all_games),
        "n_export_nfl_ml_matched_asof": used,
        "n_market_pairs": len(pairs_mkt),
        "brier_market": brier(pairs_mkt),
        "brier_adj_epa_asof": brier(pairs_adj),
        "method": "ratings fit on pbp games strictly before test season/week when year in {2024,2025}; 2026 export rows excluded (no future ratings)",
        "kill_line": "Brier_asof < Brier_market - 0.002 on n>=272 or research-only",
        "verdict": (
            "UNDERPOWERED"
            if used < 272
            else "WIRES"
            if brier(pairs_adj) is not None and brier(pairs_mkt) is not None and brier(pairs_adj) < brier(pairs_mkt) - 0.002
            else "RESEARCH_ONLY"
        ),
        "warning": "Most board-export NFL rows are 2026 — as-of duel needs 2026 pbp when released or historical replay corpus",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
    write_report(Path(args.out), report)
    print(dumps_report({"ok": True, "out": str(args.out), "used": used, "brier_adj": report["brier_adj_epa_asof"], "brier_mkt": report["brier_market"], "verdict": report["verdict"]}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
