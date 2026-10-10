#!/usr/bin/env python3
"""
nfl_weather_fix.py — NFL weather coefficients, rebuilt properly.
Fixes the failed subagent lane: 32-team coords, roof filter, km/h->mph,
Open-Meteo archive cached per city, margins AND totals by wind/rain/cold.
"""
import csv, json, math, os, statistics, time, urllib.request
from collections import defaultdict
from datetime import datetime

HERE = "/var/minis/workspace/nfl"
DATA = f"{HERE}/data"
CITY = {  # team abbr -> (lat, lon) — stadium-metro coords
    "ARI": (33.5276, -112.2626), "ATL": (33.7554, -84.4008), "BAL": (39.2780, -76.6227),
    "BUF": (42.7738, -78.7870), "CAR": (35.2258, -80.8528), "CHI": (41.8623, -87.6167),
    "CIN": (39.0954, -84.5160), "CLE": (41.5061, -81.6995), "DAL": (32.7473, -97.0945),
    "DEN": (39.7439, -105.0201), "DET": (42.3410, -83.0456), "GB": (44.5013, -88.0622),
    "HOU": (29.6847, -95.4107), "IND": (39.7601, -86.1639), "JAX": (30.3238, -81.6373),
    "KC": (39.0489, -94.4839), "LV": (36.0908, -115.1830), "LAC": (33.9535, -118.3392),
    "LAR": (33.9535, -118.3392), "MIA": (25.9580, -80.2389), "MIN": (44.9742, -93.2605),
    "NE": (42.0909, -71.2643), "NO": (29.9511, -90.0812), "NYG": (40.8135, -74.0745),
    "NYJ": (40.8135, -74.0745), "PHI": (39.9008, -75.1675), "PIT": (40.4468, -80.0158),
    "SF": (37.4030, -121.9700), "SEA": (47.5952, -122.3316), "TB": (27.9760, -82.5033),
    "TEN": (36.1665, -86.7713), "WAS": (38.9076, -76.8645),
}

def main():
    rows = list(csv.DictReader(open(f"{DATA}/games_all.csv")))
    print(f"[DATA] {len(rows)} games; roof values: {sorted(set(r.get('roof','') for r in rows))}")
    outdoor = [r for r in rows if r.get("roof", "").lower() in ("outdoor", "outdoors", "open")
               and r.get("home_score") and r.get("away_score")
               and r.get("game_type") == "REG" and int(r["season"]) in (2023, 2024, 2025)]
    print(f"[OUTDOOR] {len(outdoor)} regular-season outdoor games 2023-2025")

    # cache weather per team-city over the 3-season window (32 calls)
    cpath = f"{DATA}/nfl_weather_cache.json"
    cache = json.load(open(cpath)) if os.path.exists(cpath) else {}
    needed = sorted({r["home_team"] for r in outdoor if r["home_team"] in CITY})
    for i, tm in enumerate(needed):
        if tm in cache: continue
        lat, lon = CITY[tm]
        url = (f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}"
               f"&start_date=2023-08-01&end_date=2026-01-31"
               f"&daily=wind_speed_10m_max,precipitation_sum,temperature_2m_max&timezone=auto")
        try:
            d = json.loads(urllib.request.urlopen(url, timeout=25).read())["daily"]
            cache[tm] = dict(zip(d["time"], zip(d["wind_speed_10m_max"],
                                                d["precipitation_sum"],
                                                d["temperature_2m_max"])))
        except Exception as e:
            cache[tm] = {}
        time.sleep(0.3)
        if i % 8 == 0: print(f"  weather {i}/{len(needed)}...", flush=True)
    json.dump(cache, open(cpath, "w"))
    print(f"[WEATHER] cached {sum(1 for v in cache.values() if v)} cities")

    def wclass(wind_kmh, precip, tmax):
        mph = (wind_kmh or 0) * 0.6214
        if mph >= 15: return "WIND 15+mph"
        if (precip or 0) >= 2.0: return "RAIN"
        if (tmax is not None and tmax <= 0): return "FREEZING (<=0C)"
        if (tmax is not None and tmax <= 10): return "COLD (0-10C)"
        return "mild/calm"

    buck = defaultdict(lambda: ([], []))
    joined = 0
    for r in outdoor:
        d = cache.get(r["home_team"], {}).get(r["gameday"])
        if not d or d[0] is None: continue
        joined += 1
        margin = int(r["home_score"]) - int(r["away_score"])
        total = int(r["home_score"]) + int(r["away_score"])
        buck[wclass(*d)][0].append(margin); buck[wclass(*d)][1].append(total)
    print(f"[JOINED] {joined} games with weather")

    def rep(name, xs, ys):
        if len(xs) < 20:
            print(f"   {name:<20} n={len(xs)} (small)"); return
        mm, mt = statistics.mean(xs), statistics.mean(ys)
        sem = statistics.stdev(xs)/math.sqrt(len(xs))
        set_ = statistics.stdev(ys)/math.sqrt(len(ys))
        print(f"   {name:<20} n={len(xs):>4} | margin {mm:>6.2f} ±{sem:.2f} (t={mm/sem:+.2f})"
              f" | total {mt:>6.2f} ±{set_:.2f} (t={mt/set_:+.2f})")
    print("\n[NFL WEATHER COEFFICIENTS — raw margin/total, outdoor REG 2023-2025]")
    for k in ("mild/calm", "WIND 15+mph", "RAIN", "COLD (0-10C)", "FREEZING (<=0C)"):
        if k in buck: rep(k, *buck[k])
    # baseline: ALL outdoor mild/calm games as reference for deltas
    ref = buck.get("mild/calm", ([], []))
    if ref[0] and "WIND 15+mph" in buck:
        dm = statistics.mean(buck["WIND 15+mph"][0]) - statistics.mean(ref[0])
        dt = statistics.mean(buck["WIND 15+mph"][1]) - statistics.mean(ref[1])
        print(f"\n[DELTA vs mild] WIND15+: margin {dm:+.2f}, total {dt:+.2f} "
              f"(NFL prior said -0.197/mph ~ -3.0 at 15mph; measured {dt:+.1f})")
    if ref[0] and "RAIN" in buck:
        dm = statistics.mean(buck["RAIN"][0]) - statistics.mean(ref[0])
        dt = statistics.mean(buck["RAIN"][1]) - statistics.mean(ref[1])
        print(f"[DELTA vs mild] RAIN:    margin {dm:+.2f}, total {dt:+.2f}")

if __name__ == "__main__":
    main()
