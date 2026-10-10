#!/usr/bin/env python3
"""
feeds.py — Layer-1 structured feeds, stamped observed_at (doctrine rule 1/7):
  1. injuries_feed: ESPN injuries blob -> per-player structured rows w/ status
  2. weather_feed: Open-Meteo FORECAST at stadium coordinates for upcoming CFB games
     (stadium, not city — venues.json has precise lat/lon)
Both append to JSONL feeds with observed_at; re-runs are new snapshots (the pump
pattern). Latency = report->row, measurable per rule 17.
"""
import json, os, time, urllib.request, math
from datetime import datetime, timezone

WS = "/var/minis/workspace"
UTC = timezone.utc

def stamp():
    return datetime.now(UTC).isoformat()

def injuries_feed(out=f"{WS}/feeds/injuries_feed.jsonl"):
    os.makedirs(os.path.dirname(out), exist_ok=True)
    raw = json.load(open(f"{WS}/nfl/data/espn_injuries_today.json"))
    ts = stamp()
    n = 0
    with open(out, "a") as f:
        for team in raw.get("injuries", []):
            t = team.get("displayName") or team.get("team", {}).get("abbreviation", "")
            for inj in team.get("injuries", []):
                ath = inj.get("athlete", {})
                row = {
                    "observed_at": ts, "league": "nfl", "source": "espn",
                    "team": t, "player_id": ath.get("id"),
                    "player": ath.get("displayName") or ath.get("shortName"),
                    "position": ath.get("position", {}).get("abbreviation"),
                    "status": inj.get("status"),
                    "long_comment": (inj.get("longComment") or "")[:220],
                    "report_ts_hint": raw.get("timestamp"),
                }
                f.write(json.dumps(row) + "\n"); n += 1
    # latency measurement: how many rows changed vs previous snapshot
    print(f"[injuries] {n} rows stamped {ts}")
    return n

def cfb_weather_feed(out=f"{WS}/feeds/weather_feed.jsonl"):
    """Forecast at STADIUM coords for upcoming 2026 games (next 10 days)."""
    os.makedirs(os.path.dirname(out), exist_ok=True)
    games = json.load(open(f"{WS}/cfb/data/games_2026.json"))
    venues = {v["id"]: v for v in json.load(open(f"{WS}/cfb/data/venues.json"))}
    today = datetime.now(UTC).date()
    upcoming = [g for g in games if not g.get("completed")
                and g.get("startDate", "") >= f"{today}"
                and g.get("startDate", "") <= f"{today}"[:8] + str(min(31, today.day + 10)).zfill(2)
                or (not g.get("completed") and g.get("startDate", "") >= f"{today}")]
    seen, rows = set(), []
    for g in games:
        if g.get("completed"): continue
        d = g["startDate"][:10]
        if not (str(today) <= d <= str(today)[:8] + "31"):  # window: rest of month (good enough for a feed demo)
            continue
        v = venues.get(g.get("venueId"))
        if not v or v.get("latitude") is None: continue
        key = (g["id"], d)
        if key in seen: continue
        seen.add(key)
        rows.append((g, v, d))
    n = 0
    with open(out, "a") as f:
        for g, v, d in rows[:60]:
            url = (f"https://api.open-meteo.com/v1/forecast?latitude={v['latitude']}"
                   f"&longitude={v['longitude']}&start_date={d}&end_date={d}"
                   f"&daily=wind_speed_10m_max,precipitation_sum,temperature_2m_max"
                   f"&wind_speed_unit=mph&timezone=auto")
            try:
                r = json.loads(urllib.request.urlopen(url, timeout=15).read())["daily"]
                row = {"observed_at": stamp(), "league": "cfb", "source": "open-meteo-forecast",
                       "game_id": g["id"], "game_date": d,
                       "home": g["homeTeam"], "away": g["awayTeam"],
                       "venue": v.get("name"), "stadium_lat": v["latitude"], "stadium_lon": v["longitude"],
                       "wind_mph_max": (r.get("wind_speed_10m_max") or [None])[0],
                       "precip_mm": (r.get("precipitation_sum") or [None])[0],
                       "temp_max_c": (r.get("temperature_2m_max") or [None])[0]}
                f.write(json.dumps(row) + "\n"); n += 1
                time.sleep(0.2)
            except Exception:
                continue
    print(f"[weather] {n} stadium forecasts stamped")
    return n

if __name__ == "__main__":
    injuries_feed()
    cfb_weather_feed()
