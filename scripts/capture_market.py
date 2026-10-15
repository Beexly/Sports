#!/usr/bin/env python3
"""capture_market.py -- snapshot live NFL market lines with a real timestamp.

WHY: CLV and line movement were previously UNMEASURABLE. The archived Pinnacle
snapshots contain 911 unique matchupIds and ZERO of them appear at two
timestamps, so no movement could ever be computed. Repeated captures of the same
live board are what create the two-timestamp pairs that were missing.

DIAGNOSTIC ONLY. Append-only JSON snapshots. Never writes the gate file.
"""
import json
import os
import sys
import time
import urllib.request

OUT = os.path.join(
    os.environ.get("LOCALAPPDATA", ""),
    "hermes", "cache", "scratch", "market",
)
URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"


def fetch():
    req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.loads(r.read().decode("utf-8"))


def flatten(data, ts):
    rows = []
    for ev in data.get("events", []):
        comp = (ev.get("competitions") or [{}])[0]
        comps = comp.get("competitors") or []
        home = next((c for c in comps if c.get("homeAway") == "home"), {})
        away = next((c for c in comps if c.get("homeAway") == "away"), {})
        odds = (comp.get("odds") or [{}])[0]
        prov = odds.get("provider") or {}
        rows.append({
            "event_id": ev.get("id"),
            "date": ev.get("date"),
            "name": ev.get("name"),
            "home": (home.get("team") or {}).get("abbreviation"),
            "away": (away.get("team") or {}).get("abbreviation"),
            "home_score": home.get("score"),
            "away_score": away.get("score"),
            "status": (ev.get("status") or {}).get("type", {}).get("name"),
            "spread": odds.get("spread"),
            "over_under": odds.get("overUnder"),
            "home_ml": odds.get("homeMoneyLine"),
            "away_ml": odds.get("awayMoneyLine"),
            "details": odds.get("details"),
            "provider": prov.get("name"),
            "captured_at": ts,
        })
    return rows


def main():
    os.makedirs(OUT, exist_ok=True)
    ts = int(time.time())
    try:
        data = fetch()
    except Exception as e:
        print("FETCH FAILED:", e)
        return 1
    rows = flatten(data, ts)
    if not rows:
        print("no games on the board")
        return 0
    path = os.path.join(OUT, "espn_%d.json" % ts)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=1)

    print("captured %d games at %d -> %s" % (len(rows), ts, path))
    live = [r for r in rows if r["status"] not in ("STATUS_FINAL",)]
    with_lines = [r for r in rows if r["spread"] is not None]
    print("  not final : %d" % len(live))
    print("  with lines: %d" % len(with_lines))
    for r in rows[:12]:
        print("    %-10s %-11s spread=%-7s ou=%-6s ml=%s/%s  %s"
              % (str(r["home"]) + "v" + str(r["away"]), str(r["status"])[:11],
                 str(r["spread"]), str(r["over_under"]),
                 str(r["home_ml"]), str(r["away_ml"]), str(r["details"])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
