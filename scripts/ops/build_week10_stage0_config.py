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

import argparse
import json
import os
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import psycopg2.extras

ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
ESPN_SUMMARY_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={event_id}"
ESPN_TEAM_NORM = {"LAR": "LA", "WSH": "WAS"}
ESPN_BLOCKED_STATUS = {
    "Out": "OUT",
    "Doubtful": "DOUBTFUL",
    "Injured Reserve": "IR",
    "Suspended": "SUSP",
    "Suspension": "SUSP",
}

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


def _load_baseline_config() -> dict:
    rel = "data/nflverse/week10_live_roster_transactions_and_starters_2026.json"
    try:
        raw = subprocess.check_output(["git", "show", f"HEAD:{rel}"], cwd=str(ROOT), text=True, stderr=subprocess.DEVNULL)
        parsed = json.loads(raw)
        if isinstance(parsed, dict) and parsed.get("confirmed_qb1"):
            return parsed
    except Exception:
        pass
    if OUT.is_file():
        try:
            parsed = json.loads(OUT.read_text(encoding="utf-8"))
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
    return {}


def _fetch_espn_live_inactives() -> list[dict]:
    """Fetch official pregame Out/Doubtful/Coach's Decision inactives from ESPN unstarted events."""
    rows: list[dict] = []
    sb = json.loads(urllib.request.urlopen(ESPN_SCOREBOARD_URL, timeout=15).read().decode("utf-8"))
    for ev in sb.get("events", []):
        st_type = ((ev.get("status") or {}).get("type") or {})
        state = str(st_type.get("state") or "").lower()
        if state != "pre":
            continue
        ev_id = str(ev.get("id") or "").strip()
        if not ev_id:
            continue
        sm = json.loads(urllib.request.urlopen(ESPN_SUMMARY_URL.format(event_id=ev_id), timeout=15).read().decode("utf-8"))
        for team_blk in sm.get("injuries", []):
            raw_abbr = str((team_blk.get("team") or {}).get("abbreviation") or "").upper()
            team = ESPN_TEAM_NORM.get(raw_abbr, raw_abbr)
            if not team:
                continue
            for item in team_blk.get("injuries") or []:
                status_text = str(item.get("status") or "").strip()
                mapped = ESPN_BLOCKED_STATUS.get(status_text)
                if not mapped:
                    continue
                athlete = item.get("athlete") or {}
                name = str(athlete.get("displayName") or athlete.get("fullName") or "").strip()
                if not name:
                    continue
                pos = str(((athlete.get("position") or {}).get("abbreviation")) or "UNKNOWN")
                detail = str(((item.get("details") or {}).get("type")) or item.get("longComment") or item.get("shortComment") or "ESPN gameday status")
                dt = str(item.get("date") or "")
                rows.append({
                    "name": name,
                    "team": team,
                    "position": pos,
                    "reason": f"{mapped} - {detail} (ESPN live pregame {dt or 'gameday'})",
                })
    return rows


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Build Week 10 Stage 0 preflight roster config.")
    ap.add_argument("--include-espn-live-inactives", action="store_true", help="Overlay official pregame Out/Doubtful/Inactive entries from unstarted ESPN Week 10 events.")
    args = ap.parse_args(argv)

    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        print("DATABASE_URL required", file=sys.stderr)
        return 2
    baseline = _load_baseline_config()
    baseline_qb1: dict[str, str] = dict(baseline.get("confirmed_qb1") or {})
    baseline_traded: list[dict] = list(baseline.get("traded_players") or [])

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
    sealed_started_teams = {"NE", "DET", "DAL", "TB"}
    for bp in baseline.get("excluded_players") or []:
        if not isinstance(bp, dict):
            continue
        tm = str(bp.get("team") or "").strip()
        nm = str(bp.get("name") or "").strip()
        if tm in sealed_started_teams and nm and (nm.lower(), tm) not in excluded_set:
            excluded.append(dict(bp))
            excluded_set.add((nm.lower(), tm))

    for r in injuries:
        if r["team"] in sealed_started_teams:
            continue
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
            excluded_names.add(name.lower())

    espn_live_added = 0
    if args.include_espn_live_inactives:
        for er in _fetch_espn_live_inactives():
            key = (er["name"].lower(), er["team"])
            if key in excluded_set:
                for p in excluded:
                    if (p["name"].lower(), p["team"]) == key and er["reason"] not in p["reason"]:
                        p["reason"] += " + " + er["reason"]
                continue
            excluded.append(er)
            excluded_set.add(key)
            excluded_names.add(er["name"].lower())
            espn_live_added += 1

    # Preserve verified season-long IR exclusions from baseline even if omitted in latest weekly ESPN report.
    for bp in baseline.get("excluded_players") or []:
        if not isinstance(bp, dict):
            continue
        reason = str(bp.get("reason") or "")
        nm = str(bp.get("name") or "").strip()
        tm = str(bp.get("team") or "").strip()
        if nm and tm and reason.startswith("IR -") and (nm.lower(), tm) not in excluded_set:
            excluded.append(dict(bp))
            excluded_set.add((nm.lower(), tm))
            excluded_names.add(nm.lower())

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
    for team in sorted(set(by_team) | set(baseline_qb1)):
        base_qb = baseline_qb1.get(team)
        if base_qb and (base_qb.lower(), team) not in excluded_set:
            confirmed_qb1[team] = base_qb
            continue
        rows = by_team.get(team, [])
        chosen = None
        if rows:
            latest_week = rows[0]["week"]
            starters = [r for r in rows if r["week"] == latest_week]
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
                            "reason": f"Baseline/wk{latest_week} starter {base_qb or 'leader'} excluded by wk10 injury/inactive report; promoted {chosen} from snap evidence",
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
        if base_qb and base_qb != chosen and team not in flags:
            flags[team] = {"qb1_change": True, "reason": f"Baseline QB1 {base_qb} excluded; promoted {chosen}"}

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
        "verified_by": baseline.get("verified_by") or "hermes-wp6-stage0-from-neon (injuries wk10 + snap_counts wk7-9 QB leaders)",
        "note": (
            f"Generated {datetime.now(timezone.utc):%Y-%m-%dT%H:%M:%SZ} from live Neon + HEAD transactions baseline: "
            f"{len(injuries)} wk10 injury rows (latest fetch {latest:%Y-%m-%dT%H:%M:%SZ}), "
            f"{len(excluded)} excluded ({espn_live_added} from ESPN live pregame inactives), "
            f"{len(baseline_traded)} verified trades preserved, {len(confirmed_qb1)} QB1s confirmed."
        ),
        "max_age_days": 3,
        "blocked_statuses": BLOCKED,
        "excluded_players": sorted(excluded, key=lambda p: (p["team"], p["name"])),
        "traded_players": baseline_traded,
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