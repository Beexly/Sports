"""
Public ESPN API client (keyless).

Based on patterns from pseudo-r/Public-ESPN-API.
Scoreboard, odds, injuries. Additive JSON output.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen

OUTPUT = Path("artifacts/gse_integrations/espn")
OUTPUT.mkdir(parents=True, exist_ok=True)

UA = "Mozilla/5.0 (compatible; GSE-ESPN-Client/1.0)"


def _get(url: str) -> tuple[int, Any]:
    req = Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urlopen(req, timeout=20) as r:
        return r.status, json.loads(r.read().decode())


def scoreboard(sport: str = "football", league: str = "nfl") -> dict[str, Any]:
    url = f"https://site.web.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard"
    status, data = _get(url)
    events = data.get("events", [])
    summary = {
        "source": "espn_scoreboard",
        "url": url,
        "status": status,
        "events": len(events),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "games": [],
    }
    for ev in events:
        comp = (ev.get("competitions") or [{}])[0]
        odds = (comp.get("odds") or [{}])[0]
        summary["games"].append({
            "name": ev.get("name"),
            "status": ev.get("status", {}).get("type", {}).get("name"),
            "spread": odds.get("details"),
            "total": odds.get("overUnder"),
            "provider": odds.get("provider", {}).get("name"),
        })
    path = OUTPUT / f"scoreboard_{league}_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.json"
    path.write_text(json.dumps({"summary": summary, "raw": data}, indent=2, default=str))
    return summary


def injuries(sport: str = "football", league: str = "nfl") -> dict[str, Any]:
    # ESPN injuries endpoint pattern
    url = f"https://site.web.api.espn.com/apis/site/v2/sports/{sport}/{league}/injuries"
    try:
        status, data = _get(url)
    except Exception as e:
        return {"source": "espn_injuries", "status": 0, "honesty": str(e), "teams": 0}
    teams = data.get("injuries", data.get("teams", []))
    summary = {
        "source": "espn_injuries",
        "url": url,
        "status": status,
        "teams": len(teams) if isinstance(teams, list) else 0,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    path = OUTPUT / f"injuries_{league}_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.json"
    path.write_text(json.dumps({"summary": summary, "raw": data}, indent=2, default=str))
    return summary


if __name__ == "__main__":
    print(json.dumps(scoreboard(), indent=2))
    print(json.dumps(injuries(), indent=2))
