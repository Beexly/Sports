#!/usr/bin/env python3
"""T-00 --dry-run-pre-sim (WP-7 prerequisite gate, fail-closed).

Validates EVERY remaining Week 10 NFL game is simulation-ready WITHOUT running
any simulation or JEV call:

  1. Stage 0 roster config for week 10 exists and is fresh (preflight gate).
  2. Game rows: 13 remaining (status != FINAL, kickoff in the future, window
     2026-11-13..2026-11-18), no duplicate fixtures.
  3. Per game: Week 10 injury rows for BOTH teams, >= 1 odds row, and a
     confirmed QB1 for BOTH teams in the Stage 0 config (omitted team = NOT
     ready; fail-closed, never a guess).

Exit 0 only when all games are ready. Prints a JSON readiness report.
DATABASE_URL from env, else neonctl hermes_ro.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import psycopg2
import psycopg2.extras

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts" / "ops"))
from preflight_live_roster_injury_gate import load_config, PreflightRosterGateError  # noqa: E402

WEEK = 10
SEASON = 2026
NFL_SPORT = "cmpg6t7v900031heri45v3d8s"
CONFIG = ROOT / "data" / "nflverse" / f"week{WEEK}_live_roster_transactions_and_starters_2026.json"

FULL_TO_ABBR = {
    "Arizona Cardinals": "ARI", "Atlanta Falcons": "ATL", "Baltimore Ravens": "BAL",
    "Buffalo Bills": "BUF", "Carolina Panthers": "CAR", "Chicago Bears": "CHI",
    "Cincinnati Bengals": "CIN", "Cleveland Browns": "CLE", "Dallas Cowboys": "DAL",
    "Denver Broncos": "DEN", "Detroit Lions": "DET", "Green Bay Packers": "GB",
    "Houston Texans": "HOU", "Indianapolis Colts": "IND", "Jacksonville Jaguars": "JAX",
    "Kansas City Chiefs": "KC", "Las Vegas Raiders": "LV", "Los Angeles Chargers": "LAC",
    "Los Angeles Rams": "LAR", "Miami Dolphins": "MIA", "Minnesota Vikings": "MIN",
    "New England Patriots": "NE", "New Orleans Saints": "NO", "New York Giants": "NYG",
    "New York Jets": "NYJ", "Philadelphia Eagles": "PHI", "Pittsburgh Steelers": "PIT",
    "San Francisco 49ers": "SF", "Seattle Seahawks": "SEA", "Tampa Bay Buccaneers": "TB",
    "Tennessee Titans": "TEN", "Washington Commanders": "WAS",
}
# nflverse/Neon store the Rams as 'LA'; canonical display stays 'LAR'.
ABBR_ALIASES = {"LAR": "LA"}


def data_abbr(abbr: str | None) -> str | None:
    return ABBR_ALIASES.get(abbr, abbr) if abbr else abbr


def main() -> int:
    report: dict = {"gate": "T-00", "mode": "dry-run-pre-sim", "week": WEEK, "games": [], "ready": False}

    # 1. Stage 0 freshness (hard).
    try:
        cfg = load_config(CONFIG)
        report["stage0"] = {"as_of": cfg["as_of"], "excluded": len(cfg["excluded_players"]), "qb1s": len(cfg["confirmed_qb1"])}
    except (PreflightRosterGateError, FileNotFoundError) as exc:
        report["stage0_error"] = str(exc)
        print(json.dumps(report, indent=2))
        print("T-00 FAIL: Stage 0 config missing/stale", file=sys.stderr)
        return 1
    qb1 = cfg["confirmed_qb1"]

    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        url = subprocess.run(
            ["neonctl", "connection-string", "main", "--project-id", "summer-brook-99380762", "--role-name", "hermes_ro"],
            capture_output=True, text=True, check=True,
        ).stdout.strip().splitlines()[-1]
    conn = psycopg2.connect(url)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(
        'SELECT id, "homeTeamName", "awayTeamName", "commenceTime", status FROM games '
        'WHERE "sportId"=%s AND "commenceTime" >= %s AND "commenceTime" < %s '
        'AND status <> %s AND "commenceTime" > NOW() ORDER BY "commenceTime"',
        (NFL_SPORT, "2026-11-13T00:00:00Z", "2026-11-18T00:00:00Z", "FINAL"),
    )
    games = cur.fetchall()
    report["remaining_games"] = len(games)

    # duplicate fixture check (normalized pair)
    pairs = [tuple(sorted((g["homeTeamName"], g["awayTeamName"]))) for g in games]
    dupes = len(pairs) != len(set(pairs))
    report["duplicate_fixtures"] = dupes

    cur.execute('SELECT team, count(*) AS n FROM injuries WHERE season=%s AND week=%s GROUP BY team', (SEASON, WEEK))
    inj_by_team = {r["team"]: r["n"] for r in cur.fetchall()}

    all_ready = True
    for g in games:
        home, away = FULL_TO_ABBR.get(g["homeTeamName"]), FULL_TO_ABBR.get(g["awayTeamName"])
        dh, da = data_abbr(home), data_abbr(away)
        cur.execute('SELECT count(*) AS n, max("fetchedAt") AS latest FROM odds WHERE "gameId"=%s', (g["id"],))
        odds = cur.fetchone()
        reasons = []
        if home is None or away is None:
            reasons.append("team abbreviation unmapped")
        else:
            if inj_by_team.get(dh, 0) == 0:
                reasons.append(f"no wk10 injury rows for {home}")
            if inj_by_team.get(da, 0) == 0:
                reasons.append(f"no wk10 injury rows for {away}")
            if dh not in qb1:
                reasons.append(f"{home} QB1 not confirmed (Stage 0 fail-closed)")
            if da not in qb1:
                reasons.append(f"{away} QB1 not confirmed (Stage 0 fail-closed)")
        if odds["n"] == 0:
            reasons.append("no odds rows")
        ready = not reasons
        all_ready = all_ready and ready
        report["games"].append({
            "game_id": g["id"], "matchup": f'{g["awayTeamName"]} @ {g["homeTeamName"]}',
            "kickoff": str(g["commenceTime"]), "home": home, "away": away,
            "injury_rows": {"home": inj_by_team.get(home, 0), "away": inj_by_team.get(away, 0)},
            "odds_rows": odds["n"], "ready": ready, "blockers": reasons,
        })
    conn.close()

    if len(games) != 13:
        all_ready = False
        report["expected_13_remaining"] = False
    if dupes:
        all_ready = False
    report["ready"] = all_ready
    print(json.dumps(report, indent=2, default=str))
    if not all_ready:
        print("T-00 FAIL: not all Week 10 games simulation-ready (REFUSE_PROJECTION)", file=sys.stderr)
        return 1
    print("T-00 PASS: 13/13 games simulation-ready")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())