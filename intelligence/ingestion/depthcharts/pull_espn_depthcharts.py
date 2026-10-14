"""ESPN depth-chart ingestion - the defensive side the matchup engine lacks.

Keyless public ESPN core API: per-team depth charts for the 2026 season
(units: Base 3-4 D with LCB/RCB/NB, 3WR 1TE offense, special teams). Slot-1
athletes are the starters; slots 2+ are the backup ladder.

Lands docs/data-sources/research/<date>/depthcharts/espn-depthcharts-2026.json:
{team_abbr: {unit|POS: [(slot, athlete_name), ...]}}

This is the CB data the matchup engine needs to pair a specific receiver
against a specific corner (doctrine Move 3: the depth the market does not
have). No auth, robots-friendly public API, 34 requests total (32 teams +
team directory + season check), 0.5s pacing.
"""

from __future__ import annotations

import argparse
import json
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
OUTROOT = REPO / "docs" / "data-sources" / "research"

UA = {"User-Agent": "GSE-depthchart-ingest/1.0 (keyless ESPN public API)"}
SEASON = 2026
DEFENSIVE_POS = {"LCB", "RCB", "NB", "CB", "FS", "SS", "LDE", "RDE", "NT", "WLB", "LILB", "SLB"}


def _get(url: str) -> dict:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _athlete_name(ref: str, cache: dict[str, str]) -> str:
    aid = ref.split("/")[-1].split("?")[0]
    if aid in cache:
        return cache[aid]
    try:
        d = _get(f"https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/{SEASON}/athletes/{aid}")
        name = d.get("displayName") or aid
    except Exception:
        name = aid  # honest fallback: id instead of an invented name
    cache[aid] = name
    time.sleep(0.35)
    return name


def team_directory() -> dict[str, int]:
    d = _get("https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams")
    out: dict[str, int] = {}
    for t in d["sports"][0]["leagues"][0]["teams"]:
        out[t["team"]["abbreviation"]] = int(t["team"]["id"])
    return out


def team_depthchart(team_id: int, name_cache: dict[str, str]) -> dict:
    url = f"https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/{SEASON}/teams/{team_id}/depthcharts"
    try:
        d = _get(url)
    except Exception as exc:
        return {"error": f"{type(exc).__name__}: {exc}"}
    chart: dict[str, list] = {}
    for unit in d.get("items") or []:
        uname = unit.get("name") or "?"
        for _pk, pos in (unit.get("positions") or {}).items():
            abbr = (pos.get("position") or {}).get("abbreviation") or "?"
            for a in pos.get("athletes") or []:
                ref = (a.get("athlete") or {}).get("$ref", "")
                name = _athlete_name(ref, name_cache) if ref else "?"
                chart.setdefault(f"{uname}|{abbr}", []).append({"slot": a.get("slot"), "athlete": name})
    return chart


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--teams", default=None, help="comma-separated abbrs (default: all 32)")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()
    directory = team_directory()
    teams = args.teams.split(",") if args.teams else sorted(directory)
    name_cache: dict[str, str] = {}
    digest: dict = {"generated_utc": datetime.now(timezone.utc).isoformat(),
                    "season": SEASON, "source": "ESPN core depthcharts API (keyless)",
                    "teams": {}}
    for ab in teams:
        tid = directory.get(ab)
        if not tid:
            digest["teams"][ab] = {"error": "unknown abbr"}
            continue
        chart = team_depthchart(tid, name_cache)
        digest["teams"][ab] = chart
        n_cbs = sum(len(v) for k, v in chart.items() if "|LCB" in k or "|RCB" in k or "|NB" in k)
        print(f"{ab}: {len(chart)} position rows, {n_cbs} CB slots")
        time.sleep(0.5)
    out = Path(args.out) if args.out else OUTROOT / datetime.now(timezone.utc).date().isoformat() / "depthcharts" / "espn-depthcharts-2026.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(digest, indent=1), encoding="utf-8")
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
