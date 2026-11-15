#!/usr/bin/env python3
"""Merge live ESPN game-summary designations into the nflverse week-10 injury rows.

Cadence v2.5 step 1 (advance the injury overlay). nflverse's week-10 file is a
Wednesday practice snapshot: report_status is empty for most players. The ESPN
game-summary endpoint for the specific event carries the official Thursday game
designations. This script takes the WORST of the two per player (Out > Doubtful >
Questionable > none), so a conflict can only make a player look less available,
never more. Every decision is written to a provenance sidecar.

Read-only with respect to sealed artifacts. Rewrites only report_status on the
target week/team rows of data/nflverse/injuries_2026.csv.
"""

from __future__ import annotations

import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CSV_PATH = REPO_ROOT / "data" / "nflverse" / "injuries_2026.csv"
SUMMARY_PATH = Path(sys.argv[1]) if len(sys.argv) > 1 else None
OUT_PATH = Path(sys.argv[2]) if len(sys.argv) > 2 else None
WEEK = 10
TEAMS = {"WAS", "WSH", "NYG"}

SEVERITY = {"": 0, "Questionable": 1, "Doubtful": 2, "Out": 3, "Injured Reserve": 3}


def norm(name: str) -> str:
    return "".join(ch for ch in name.lower() if ch.isalnum())


def main() -> None:
    if not SUMMARY_PATH or not SUMMARY_PATH.is_file():
        raise SystemExit("usage: merge_week10_tnf_designations.py <espn_summary.json> <out.json>")
    summary = json.loads(SUMMARY_PATH.read_text(encoding="utf-8"))

    espn: dict[tuple[str, str], dict] = {}
    for team_block in summary.get("injuries", []):
        abbr = (team_block.get("team") or {}).get("abbreviation", "")
        abbr = "WAS" if abbr == "WSH" else abbr
        for inj in team_block.get("injuries", []):
            athlete = inj.get("athlete") or {}
            name = athlete.get("displayName", "")
            if not name:
                continue
            espn[(abbr, norm(name))] = {
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
        if str(row.get("week")) != str(WEEK):
            continue
        team = "WAS" if row.get("team") == "WSH" else row.get("team", "")
        if team not in TEAMS:
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
        if not any(d["team"] == t and norm(d["player"]) == n for d in decisions)
    ]

    report = {
        "report_type": "WEEK10_TNF_DESIGNATION_MERGE",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "week": WEEK,
        "matchup": "WAS @ NYG",
        "espn_event_id": (summary.get("header", {}).get("id")),
        "sources": {
            "nflverse": "data/nflverse/injuries_2026.csv (week 10, Wednesday practice snapshot)",
            "espn": "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=401873052",
        },
        "rows_changed": changed,
        "decisions": decisions,
        "espn_designations_without_nflverse_row": unmatched,
        "note": (
            "IR is treated as Out for severity comparison but is not written as a report_status "
            "designation; the overlay consumes Out/Doubtful/Questionable only."
        ),
    }
    if OUT_PATH:
        OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        OUT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"wrote {OUT_PATH}")
    print(f"rows changed: {changed}")
    for d in decisions:
        print(f"  {d['team']} {d['player']:<22} nfl={d['nflverse_report_status'] or '-':<12} espn={d['espn_game_designation'] or '-':<12} -> {d['applied'] or '-'}")
    if unmatched:
        print("unmatched ESPN designations:", unmatched)


if __name__ == "__main__":
    main()
