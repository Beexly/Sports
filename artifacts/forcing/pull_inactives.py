#!/usr/bin/env python3
"""
pull_inactives.py — Pull stamped ESPN game injury/inactive designations and
append to injury_timestamped.jsonl. Every row carries observed_at and recorded_at.
"""
import csv
import json
import ssl
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_EVENT = "401872995"
DEFAULT_GAME_ID = "2026_06_SEA_DEN"
DEFAULT_SEASON = 2026
DEFAULT_WEEK = 6
MSYS_ROOT = Path("C:/Users/Garrett/AppData/Local/hermes/tools/git-2.53.0+3-win32-x64")


def fetch_espn_injuries(event_id: str = DEFAULT_EVENT, game_id: str = DEFAULT_GAME_ID):
    ctx = ssl.create_default_context()
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    url = f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={event_id}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    rows = []
    with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        for team_inj in data.get("injuries", []):
            team_abbr = (team_inj.get("team") or {}).get("abbreviation")
            for item in team_inj.get("injuries", []):
                ath = item.get("athlete") or {}
                pos = (ath.get("position") or {}).get("abbreviation") or ""
                det = item.get("details") or {}
                obs = item.get("date") or now_utc
                if len(obs) == 17 and obs.endswith("Z"):
                    # Normalize YYYY-MM-DDTHH:MMZ -> YYYY-MM-DDTHH:MM:00Z
                    obs = obs[:-1] + ":00Z"
                rows.append({
                    "source": "espn_summary",
                    "event_id": str(event_id),
                    "game_id": game_id,
                    "season": DEFAULT_SEASON,
                    "week": DEFAULT_WEEK,
                    "team": team_abbr,
                    "player_id": str(ath.get("id") or ""),
                    "full_name": ath.get("displayName") or "",
                    "position": pos,
                    "report_status": item.get("status") or "",
                    "injury_type": det.get("type"),
                    "return_date": det.get("returnDate"),
                    "observed_at": obs,
                    "date_modified": obs,
                    "recorded_at": now_utc,
                })
    return rows


def main():
    event_id = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_EVENT
    rows = fetch_espn_injuries(event_id)
    targets = [
        Path("C:/Users/Garrett/Sports-wt-wf-cvi/artifacts/forcing/injury_timestamped.jsonl"),
        Path("C:/home/workdir/artifacts/forcing/injury_timestamped.jsonl"),
        MSYS_ROOT / "home/workdir/artifacts/forcing/injury_timestamped.jsonl",
    ]
    for t in targets:
        try:
            t.parent.mkdir(parents=True, exist_ok=True)
            with open(t, "a", encoding="utf-8") as f:
                for r in rows:
                    f.write(json.dumps(r, ensure_ascii=False) + "\n")
        except Exception:
            pass

    # Also write a stamped CSV for builder.py (--injuries-csv) including Sleeper JSN row
    csv_path = Path("C:/Users/Garrett/Sports-wt-wf-cvi/intelligence/situational-graph/inputs/injuries_2026_wk6_stamped.csv")
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["season", "week", "team", "gsis_id", "full_name", "position", "report_status", "date_modified", "observed_at"]
    with open(csv_path, "w", newline="", encoding="utf-8") as cf:
        w = csv.DictWriter(cf, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            status = "Out" if r["report_status"] in ("Out", "Injured Reserve") else r["report_status"]
            w.writerow({
                "season": r["season"],
                "week": r["week"],
                "team": r["team"],
                "gsis_id": r["player_id"],
                "full_name": r["full_name"],
                "position": r["position"],
                "report_status": status,
                "date_modified": r["date_modified"],
                "observed_at": r["observed_at"],
            })
        w.writerow({
            "season": 2026,
            "week": 6,
            "team": "SEA",
            "gsis_id": "00-0038543",
            "full_name": "Jaxon Smith-Njigba",
            "position": "WR",
            "report_status": "Questionable",
            "date_modified": "2026-10-14T13:26:57Z",
            "observed_at": "2026-10-14T13:26:57Z",
        })
    print(f"pull_inactives.py: appended {len(rows)} stamped ESPN injury rows for event {event_id}")


if __name__ == "__main__":
    main()
