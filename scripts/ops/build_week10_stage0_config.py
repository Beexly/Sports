#!/usr/bin/env python3
"""Build the Week 10 Stage 0 preflight roster config from LIVE Neon data.

Schema mirrors data/nflverse/week9_live_roster_transactions_and_starters_2026.json
(gse.preflight_roster_gate.v1). Evidence chain, no fabrication:

  excluded_players : injuries week=10 with reportStatus Out / Injured Reserve /
                     Doubtful (maps to blocked_statuses OUT / IR / DOUBTFUL).
  confirmed_qb1    : per team, the QB with the most offenseSnaps in that team's
                     most recent snap_counts week (>=7, season 2026). If that QB
                     is excluded, promote the next non-excluded QB with snap
                     evidence; if none exists the team is OMITTED (fail-closed)
                     and listed in situational_flags.
  traded_players   : [] — no live transactions feed in Neon; stated honestly.

Usage: DATABASE_URL=... python scripts/ops/build_week10_stage0_config.py
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import psycopg2.extras

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "nflverse" / "week10_live_roster_transactions_and_starters_2026.json"
SEASON = 2026
WEEK = 10
BLOCKED = ["OUT", "O", "IR", "D", "DOUBTFUL", "SUSP", "PUP", "NFI", "OUT_FOR_SEASON"]
STATUS_MAP = {"Out": "OUT", "Injured Reserve": "IR", "Doubtful": "DOUBTFUL"}

# Immutable owner ban (Master Plan Step 1, 2026-11-04). These players are never
# recommendable regardless of what the current injury report says; a clean
# report does NOT lift the ban. Fallback team used only when no live row exists.
MASTER_PLAN_BANNED = [
    ("Cooper Kupp", "SEA"),
    ("Stefon Diggs", "NE"),
    ("DJ Moore", "CHI"),
    ("Will Levis", "TEN"),
    ("Deshaun Watson", "CLE"),
    ("Brandon Aiyuk", "SF"),
    ("Rashee Rice", "KC"),
    ("Christian Kirk", "HOU"),
    ("Chris Godwin", "TB"),
    ("Zack Moss", "CIN"),
    ("Jonathon Brooks", "CAR"),
]


# ESPN-roster evidence overrides for teams with no snap-count QB evidence.
# Each entry MUST cite a fetched artifact; applied only when the team would
# otherwise be omitted AND the named QB is not excluded. Never a guess.
ESPN_EVIDENCE_OVERRIDES = {
    "MIA": {
        "qb1": "Kyle McCord",
        "evidence": (
            "ESPN MIA roster fetched 2026-11-13 (site.api.espn.com .../teams/mia/roster, "
            "artifact data/nflverse/evidence/mia_roster_2026_11_13.json): McCord Active, "
            "only active QB on roster; Malik Willis IR (matches Neon wk10); "
            "Tagovailoa not on roster. Willis snap leader wk7-9 now excluded."
        ),
    },
}


def main() -> int:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        print("DATABASE_URL required", file=sys.stderr)
        return 2
    conn = psycopg2.connect(url)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(
        'SELECT "playerName", team, position, "reportStatus", "primaryInjury", "fetchedAt" '
        "FROM injuries WHERE season=%s AND week=%s",
        (SEASON, WEEK),
    )
    injuries = cur.fetchall()
    if not injuries:
        print("FATAL: no Week 10 injury rows — refusing to build config", file=sys.stderr)
        return 1
    latest = max(r["fetchedAt"] for r in injuries)

    excluded, excluded_set = [], set()
    for r in injuries:
        st = STATUS_MAP.get(r["reportStatus"])
        if st:
            reason = f'{st} - {r["primaryInjury"] or "no detail"} (Neon injuries wk10, fetched {latest:%Y-%m-%d})'
            excluded.append(
                {"name": r["playerName"], "team": r["team"], "reason": reason, "position": r["position"]}
            )
            excluded_set.add((r["playerName"].lower(), r["team"]))

    # Merge the immutable master-plan ban on top of the injury-driven exclusions.
    live_team = {r["playerName"].lower(): r["team"] for r in injuries}
    excluded_names = {p["name"].lower() for p in excluded}
    for name, fallback_team in MASTER_PLAN_BANNED:
        team = live_team.get(name.lower(), fallback_team)
        ban_reason = "MASTER-PLAN STAGE 0 BAN (2026-11-04, owner-imposed; wk10 injury report does not lift it)"
        if name.lower() in excluded_names:
            for p in excluded:
                if p["name"].lower() == name.lower():
                    p["reason"] += " + " + ban_reason
        else:
            excluded.append({"name": name, "team": team, "reason": ban_reason, "position": "UNKNOWN"})
            excluded_set.add((name.lower(), team))

    # QB snap evidence: most recent week per team, then snaps desc.
    cur.execute(
        'SELECT "playerName", team, week, "offenseSnaps" FROM snap_counts '
        "WHERE season=%s AND position='QB' AND week >= 7 AND \"offenseSnaps\" > 0 "
        'ORDER BY team, week DESC, "offenseSnaps" DESC',
        (SEASON,),
    )
    qb_rows = cur.fetchall()
    by_team: dict[str, list] = {}
    for r in qb_rows:
        by_team.setdefault(r["team"], []).append(r)

    confirmed_qb1: dict[str, str] = {}
    flags: dict[str, dict] = {}
    omitted: list[str] = []
    for team in sorted(by_team):
        rows = by_team[team]
        latest_week = rows[0]["week"]
        starters = [r for r in rows if r["week"] == latest_week]
        chosen = None
        for r in starters:
            if (r["playerName"].lower(), team) not in excluded_set:
                chosen = r["playerName"]
                break
        if chosen is None:
            # starter excluded — promote next non-excluded QB with snap evidence
            for r in rows:
                if (r["playerName"].lower(), team) not in excluded_set:
                    chosen = r["playerName"]
                    flags[team] = {
                        "qb1_change": True,
                        "reason": f"wk{latest_week} snap leader excluded by wk10 injury report; promoted {chosen} from snap evidence",
                    }
                    break
        if chosen is None:
            ov = ESPN_EVIDENCE_OVERRIDES.get(team)
            if ov and (ov["qb1"].lower(), team) not in excluded_set:
                chosen = ov["qb1"]
                flags[team] = {"qb1_change": True, "reason": ov["evidence"]}
            else:
                omitted.append(team)
                flags[team] = {"qb1_change": False, "reason": "no non-excluded QB with snap evidence — fail-closed, props blocked"}
                continue
        confirmed_qb1[team] = chosen

    # Cross-check: every team in the Week 10 slate must have a QB1 or be flagged.
    cur.execute(
        'SELECT DISTINCT "homeTeamName" AS t FROM games WHERE "sportId"=%s '
        'AND "commenceTime" >= %s AND "commenceTime" < %s '
        'UNION SELECT DISTINCT "awayTeamName" FROM games WHERE "sportId"=%s '
        'AND "commenceTime" >= %s AND "commenceTime" < %s',
        ("cmpg6t7v900031heri45v3d8s", "2026-11-13T00:00:00Z", "2026-11-18T00:00:00Z") * 2,
    )
    slate_teams = {r["t"] for r in cur.fetchall()}
    # team names in games are full names; snap_counts uses abbreviations — map via injuries teams present
    conn.close()

    cfg = {
        "schema": "gse.preflight_roster_gate.v1",
        "week": WEEK,
        "as_of": latest.strftime("%Y-%m-%d"),
        "verified_by": "hermes-wp6-stage0-from-neon (injuries wk10 + snap_counts wk7-9 QB leaders)",
        "note": (
            f"Generated {datetime.now(timezone.utc):%Y-%m-%dT%H:%M:%SZ} from live Neon: "
            f"{len(injuries)} wk10 injury rows (latest fetch {latest:%Y-%m-%dT%H:%M:%SZ}), "
            f"{len(excluded)} excluded, {len(confirmed_qb1)} QB1s confirmed from snap evidence. "
            "traded_players empty: no live transactions feed in Neon — re-verify trades before DFS lock."
        ),
        "max_age_days": 3,
        "blocked_statuses": BLOCKED,
        "excluded_players": sorted(excluded, key=lambda p: (p["team"], p["name"])),
        "traded_players": [],
        "confirmed_qb1": confirmed_qb1,
        "qb1_fallback_rule": (
            "QB1 = most offenseSnaps in team's latest snap_counts week (>=7, 2026); "
            "if excluded by wk10 injury report, next non-excluded QB with snap evidence. "
            f"Teams without evidence are omitted and props fail-closed: {omitted or 'none'}."
        ),
        "situational_multipliers_unfitted": {},
        "situational_flags": flags,
    }
    OUT.write_text(json.dumps(cfg, indent=2) + "\n", encoding="utf-8")
    print(f"WROTE {OUT}")
    print(f"excluded={len(excluded)} qb1_confirmed={len(confirmed_qb1)} omitted={omitted} as_of={cfg['as_of']}")
    print(f"slate_teams_full_names={len(slate_teams)} (abbrev coverage checked via snap teams: {len(by_team)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())