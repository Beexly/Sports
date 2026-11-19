#!/usr/bin/env python3
"""Merge live ESPN game-summary designations into the nflverse injury rows for a TNF slot.

Generalized from merge_week10_tnf_designations.py (cadence v2.5, W10 precedent).
nflverse releases can lag the official Thursday game designations; the ESPN
game-summary endpoint for the specific event carries them. This script takes the
WORST of the two per player (Out > Doubtful > Questionable > none), so a conflict
can only make a player look less available, never more. Every decision is written
to a provenance sidecar.

Read-only with respect to sealed artifacts. Rewrites only report_status on the
target week/team rows of data/nflverse/injuries_2026.csv.

usage: merge_tnf_designations.py <espn_summary.json> <out.json> --week 11 --teams IND,HOU --matchup "IND @ HOU"
"""

from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CSV_PATH = REPO_ROOT / "data" / "nflverse" / "injuries_2026.csv"

SEVERITY = {"": 0, "Questionable": 1, "Doubtful": 2, "Out": 3, "Injured Reserve": 3}
TEAM_ALIASES = {"WSH": "WAS", "LA": "LAR"}


def norm(name: str) -> str:
    return "".join(ch for ch in name.lower() if ch.isalnum())


def canon(team: str) -> str:
    return TEAM_ALIASES.get(team, team)


def main() -> None:
    parser = argparse.ArgumentParser(description="Worst-of ESPN/nflverse TNF designation merge")
    parser.add_argument("summary", type=Path)
    parser.add_argument("out", type=Path)
    parser.add_argument("--week", type=int, required=True)
    parser.add_argument("--teams", required=True, help="comma-separated team abbreviations")
    parser.add_argument("--matchup", required=True, help='e.g. "IND @ HOU"')
    parser.add_argument(
        "--alias",
        action="append",
        default=[],
        metavar="ESPN_NAME=NFLVERSE_NAME",
        help="explicit player-name alias, repeatable (e.g. 'Jake Hummel=Jacob Hummel')",
    )
    args = parser.parse_args()
    teams = {canon(t.strip()) for t in args.teams.split(",") if t.strip()}
    aliases: dict[str, str] = {}
    for a in args.alias:
        left, _, right = a.partition("=")
        if not left or not right:
            raise SystemExit(f"bad --alias {a!r}, expected ESPN_NAME=NFLVERSE_NAME")
        aliases[norm(left)] = norm(right)

    if not args.summary.is_file():
        raise SystemExit(f"missing ESPN summary: {args.summary}")
    summary = json.loads(args.summary.read_text(encoding="utf-8"))

    espn: dict[tuple[str, str], dict] = {}
    for team_block in summary.get("injuries", []):
        abbr = canon((team_block.get("team") or {}).get("abbreviation", ""))
        for inj in team_block.get("injuries", []):
            athlete = inj.get("athlete") or {}
            name = athlete.get("displayName", "")
            if not name:
                continue
            key_name = aliases.get(norm(name), norm(name))
            espn[(abbr, key_name)] = {
                "player": name,
                "position": (athlete.get("position") or {}).get("abbreviation", ""),
                "status": inj.get("status", "") or "",
            }

    with open(CSV_PATH, encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames
        rows = list(reader)

    decisions = []
    changed = 0
    for row in rows:
        if str(row.get("week")) != str(args.week):
            continue
        team = canon(row.get("team", ""))
        if team not in teams:
            continue
        key = (team, norm(row.get("full_name", "")))
        hit = espn.get(key)
        if not hit:
            continue
        nfl = (row.get("report_status") or "").strip()
        esp = hit["status"].strip()
        worst = nfl if SEVERITY.get(nfl, 0) >= SEVERITY.get(esp, 0) else esp
        if worst != nfl:
            row["report_status"] = worst
            changed += 1
        decisions.append(
            {
                "team": team,
                "player": row.get("full_name"),
                "position_nflverse": row.get("position"),
                "position_espn": hit["position"],
                "nflverse_report_status": nfl,
                "espn_game_designation": esp,
                "applied": worst,
                "rule": "worst-of (Out > Doubtful > Questionable > none)",
            }
        )

    with open(CSV_PATH, "w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    unmatched = [
        {"team": t, "player": v["player"], "status": v["status"]}
        for (t, n), v in espn.items()
        if t in teams and not any(d["team"] == t and norm(d["player"]) == n for d in decisions)
    ]

    event_id = summary.get("header", {}).get("id")
    report = {
        "report_type": f"WEEK{args.week}_TNF_DESIGNATION_MERGE",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "week": args.week,
        "matchup": args.matchup,
        "espn_event_id": event_id,
        "sources": {
            "nflverse": f"data/nflverse/injuries_2026.csv (week {args.week})",
            "espn": f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={event_id}",
        },
        "rows_changed": changed,
        "name_aliases_applied": args.alias,
        "decisions": decisions,
        "espn_designations_without_nflverse_row": unmatched,
        "note": (
            "IR is treated as Out for severity comparison but is not written as a report_status "
            "designation; the overlay consumes Out/Doubtful/Questionable only."
        ),
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"wrote {args.out}")
    print(f"rows changed: {changed}")
    for d in decisions:
        print(f"  {d['team']} {d['player']:<24} nfl={d['nflverse_report_status'] or '-':<13} espn={d['espn_game_designation'] or '-':<16} -> {d['applied'] or '-'}")
    if unmatched:
        print("unmatched ESPN designations:", json.dumps(unmatched))


if __name__ == "__main__":
    main()
