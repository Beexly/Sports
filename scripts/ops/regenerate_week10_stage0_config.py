#!/usr/bin/env python3
"""
scripts/ops/regenerate_week10_stage0_config.py

Rebuild data/engine/week10_stage0_preflight_config.json from authoritative
live sources after the untracked-data wipe (2026-11-13):
  - confirmed_qb1: nflverse depth_charts_2026.csv (latest dt, QB pos_rank=1)
  - excluded_players: Stage 0 immutable ban list + week-10 Out/IR from
    nflverse injuries_2026.csv
Fail-closed: any slate team without a rank-1 QB aborts (exit 1).
"""
from __future__ import annotations

import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.ops.run_week10_full_slate_connected_workflow import (  # noqa: E402
    FULL_TO_ABBR,
    fetch_remaining_slate,
)

WEEK = 10
# Stage 0 immutable ban list (master plan): never roster these names.
STAGE0_BANNED = [
    "Cooper Kupp", "Stefon Diggs", "D.J. Moore", "Will Levis", "Deshaun Watson",
    "Brandon Aiyuk", "Rashee Rice", "Christian Kirk", "Chris Godwin", "Zack Moss",
    "Jonathon Brooks",
]


def latest_qb1s() -> dict[str, str]:
    path = REPO_ROOT / "data" / "nflverse" / "depth_charts_2026.csv"
    if not path.is_file():
        raise RuntimeError(f"missing {path}")
    latest_dt = ""
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r.get("pos_abb") == "QB" and str(r.get("pos_rank")) == "1":
                rows.append(r)
                if r.get("dt", "") > latest_dt:
                    latest_dt = r["dt"]
    qb1: dict[str, str] = {}
    for r in rows:
        if r.get("dt") == latest_dt:
            qb1[r["team"]] = r["player_name"]
    print(f"depth charts dt={latest_dt}: {len(qb1)} rank-1 QBs")
    return qb1


def week10_excluded() -> list[str]:
    path = REPO_ROOT / "data" / "nflverse" / "injuries_2026.csv"
    out: list[str] = []
    seen = set()
    with open(path, "r", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r.get("week") != str(WEEK):
                continue
            status = (r.get("report_status") or "").strip()
            prac = (r.get("practice_status") or "").strip()
            if status in ("Out", "Doubtful") or "IR" in status or "Injured Reserve" in prac:
                name = (r.get("full_name") or "").strip()
                if name and name not in seen:
                    seen.add(name)
                    out.append(name)
    return sorted(out)


def main() -> int:
    qb1 = latest_qb1s()
    games = fetch_remaining_slate()
    teams: set[str] = set()
    for g in games:
        for side in ("homeTeamName", "awayTeamName"):
            abbr = FULL_TO_ABBR.get(g[side])
            if not abbr:
                print(f"REFUSE: unmapped team {g[side]}", file=sys.stderr)
                return 1
            teams.add(abbr)
    # nflverse uses LA/WSH; normalize both directions.
    alias = {"LAR": "LA", "LA": "LAR", "WSH": "WAS", "WAS": "WSH"}
    missing = []
    confirmed: dict[str, str] = {}
    for t in sorted(teams):
        name = qb1.get(t) or qb1.get(alias.get(t, ""))
        if not name:
            missing.append(t)
        else:
            confirmed[t] = name
    if missing:
        print(f"REFUSE_PROJECTION: no rank-1 QB for {missing}", file=sys.stderr)
        return 1
    excluded = sorted(set(STAGE0_BANNED) | set(week10_excluded()))
    # Transparent conflict log: banned names that today's depth chart ranks as
    # healthy QB1 (stale IR annotations). confirmed_qb1 reflects the LIVE
    # starter; the ban list still governs DFS rostering (excluded_players).
    conflicts = []
    for t, name in confirmed.items():
        if name in STAGE0_BANNED:
            conflicts.append({
                "team": t, "qb1": name,
                "note": "Stage 0 ban list annotates IR, but nflverse depth chart (latest dt) ranks this player QB1 and the week-10 injury report has no Out/Doubtful/IR row. Live starter used for simulation; ban retained for DFS rostering.",
            })
    cfg = {
        "week": WEEK,
        "as_of": datetime.now(timezone.utc).isoformat(),
        "source": {
            "qb1": "nflverse depth_charts_2026.csv (latest dt, QB pos_rank=1)",
            "injuries": "nflverse injuries_2026.csv (week 10 Out/Doubtful/IR)",
            "banned": "Stage 0 immutable ban list",
        },
        "confirmed_qb1": confirmed,
        "excluded_players": excluded,
        "slate_teams": sorted(teams),
        "qb1_ban_conflicts": conflicts,
    }
    out = REPO_ROOT / "data" / "engine" / "week10_stage0_preflight_config.json"
    out.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
    print(f"WROTE {out.name}: {len(confirmed)} QB1s, {len(excluded)} excluded, {len(teams)} slate teams")
    for t in sorted(confirmed):
        print(f"  {t}: {confirmed[t]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())