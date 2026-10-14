#!/usr/bin/env python3
"""Schedule metadata puller: rest, travel miles, timezone shift, altitude, surface, roof.  DIAGNOSTIC.
Source: nflverse/nfldata games.csv (CC-BY-4.0) for rest/roof/surface/stadium_id/kickoff;
stadium table (dfs/ingest/stadiums.py: Wikidata CC0 coords, NWS timezone, USGS altitude).
Away-team origin = the venue of that team's home games in the same season (most frequent stadium_id
among its home games in that season, computed from the same file).  Missing venue fields -> the
derived field is null with a reason; no imputation.  Kickoff = gameday + gametime in America/New_York."""
import csv, io, json, os, sys, collections
from datetime import datetime
from zoneinfo import ZoneInfo
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _stamp import fetch, utcnow, sha256, write_stamped  # noqa: E402
from stadiums import haversine_miles  # noqa: E402

GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv"
ET = ZoneInfo("America/New_York")


def kickoff_utc(g):
    if g["gameday"] in ("", "NA") or g["gametime"] in ("", "NA"):
        return None
    return datetime.strptime(g["gameday"] + " " + g["gametime"], "%Y-%m-%d %H:%M").replace(tzinfo=ET).astimezone(ZoneInfo("UTC"))


def _offset_h(tz, when):
    return ZoneInfo(tz).utcoffset(when.replace(tzinfo=None)).total_seconds() / 3600 if tz else None


def build(games_raw, stadiums, lo=2015, hi=2025):
    G = [g for g in csv.DictReader(io.StringIO(games_raw.decode("utf-8"))) if lo <= int(g["season"]) <= hi]
    V = {r["stadium_id"]: r for r in stadiums["rows"]}
    home_site = collections.defaultdict(collections.Counter)
    for g in G:
        if g["location"] == "Home":
            home_site[(g["season"], g["home_team"])][g["stadium_id"]] += 1
    rows = []
    for g in G:
        ko = kickoff_utc(g); v = V.get(g["stadium_id"], {})
        origin_id = home_site[(g["season"], g["away_team"])].most_common(1)
        o = V.get(origin_id[0][0], {}) if origin_id else {}
        miles = round(haversine_miles((o["lat"], o["lon"]), (v["lat"], v["lon"])), 1) if o.get("lat") is not None and v.get("lat") is not None else None
        tz_shift = None
        if ko and o.get("timezone") and v.get("timezone"):
            tz_shift = _offset_h(v["timezone"], ko) - _offset_h(o["timezone"], ko)
        reasons = [k for k, val in (("travel_miles", miles), ("tz_shift_h", tz_shift), ("altitude_m", v.get("altitude_m"))) if val is None]
        rows.append({"game_id": g["game_id"], "season": int(g["season"]), "week": int(g["week"]),
                     "kickoff_utc": ko.strftime("%Y-%m-%dT%H:%M:%SZ") if ko else None,
                     "home_team": g["home_team"], "away_team": g["away_team"], "location": g["location"],
                     "home_rest": g["home_rest"], "away_rest": g["away_rest"], "roof": g["roof"], "surface": g["surface"],
                     "stadium_id": g["stadium_id"], "away_travel_miles": miles, "away_tz_shift_h": tz_shift,
                     "venue_altitude_m": v.get("altitude_m"), "null_fields": reasons})
    return rows


if __name__ == "__main__":
    cache = os.environ.get("NFLVERSE_CACHE", "/workspace/nflverse_cache")
    obs = utcnow()
    raw = fetch(GAMES_URL, timeout=120)
    st = json.load(open(os.path.join(cache, "stadiums.json")))
    rows = build(raw, st)
    out = os.path.join(cache, "schedule_meta_2015_2025.json")
    write_stamped(out, rows, observed_at=obs, source=GAMES_URL, games_sha256=sha256(raw),
                  stadiums_observed_at=st["observed_at"], license="nflverse/nfldata CC-BY-4.0; Wikidata CC0; NWS/USGS public domain")
    full = sum(1 for r in rows if not r["null_fields"])
    print(len(rows), "games;", full, "with travel+tz+altitude")
    sd = os.environ.get("SAMPLE_DIR")
    if sd:
        json.dump({"observed_at": obs, "source": GAMES_URL, "n_games": len(rows), "n_complete": full,
                   "sample_rows": rows[-25:]}, open(os.path.join(sd, "schedule_meta.sample.json"), "w"), indent=1)
        json.dump(st, open(os.path.join(sd, "stadiums.json"), "w"), indent=1)
