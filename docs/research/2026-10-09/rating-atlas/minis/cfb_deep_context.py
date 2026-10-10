#!/usr/bin/env python3
"""
cfb_deep_context.py — the NFL context engine, REBUILT on college rows.
Rule 3 honored: only the METHOD transfers from NFL; every coefficient is refit here.

  A. COACHES  — first-year-at-school spike, tenure curves (CFBD coaches, 1,816 records)
  B. REST     — bye-week / short-rest spots from the game calendar
  C. TRAVEL   — haversine travel distance for the road team, venue-venue
  D. WEATHER  — Open-Meteo archive on 2025 home venues -> the CFB wind/rain/cold
                coefficients (NFL's -0.197/mph is NOT assumed, it is RE-MEASURED)
All residuals measured against the cross-book closing median (the close is the prior).
"""
import json, math, os, statistics, urllib.request, time
from collections import defaultdict
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
SEASONS = [2023, 2024, 2025, 2026]
BOOKS = ["DraftKings", "ESPN Bet", "Bovada", "William Hill (New Jersey)", "Caesars Sportsbook (Colorado)"]

def amer_to_imp(a):
    if a is None: return None
    a = float(a)
    return (-a) / (-a + 100) if a < 0 else 100 / (a + 100)

def haversine(lat1, lon1, lat2, lon2):
    R = 3958.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(a))

def load_games():
    games = {}
    for y in SEASONS:
        for g in json.load(open(f"{DATA}/games_{y}.json")):
            if g.get("completed") and g.get("homePoints") is not None \
               and g.get("homeClassification") == "fbs" and g.get("awayClassification") == "fbs":
                games[g["id"]] = g
    return games

def load_closes(games):
    BL = defaultdict(dict)
    for y in SEASONS:
        for lr in json.load(open(f"{DATA}/lines_{y}.json")):
            gid = lr["id"]
            if gid not in games: continue
            for ln in lr.get("lines", []):
                p = ln.get("provider")
                if p in BOOKS:
                    cur = BL[p].get(gid)
                    if cur is None or (ln.get("lastUpdate") or "") >= cur.get("ts", ""):
                        BL[p][gid] = {"spread": ln.get("spread"), "ou": ln.get("overUnder"),
                                      "hml": ln.get("homeMoneyline"), "aml": ln.get("awayMoneyline"),
                                      "ts": ln.get("lastUpdate") or ""}
    spine = {}
    for gid in games:
        sps, ous = [], []
        for b in BOOKS:
            d = BL[b].get(gid)
            if not d: continue
            if d["spread"] is not None:
                hml, aml = d["hml"], d["aml"]
                mu = (abs(d["spread"]) if hml is not None and aml is not None and hml < aml else -abs(d["spread"])) \
                     if hml is not None else -d["spread"]
                sps.append(mu)
            if d["ou"] is not None: ous.append(d["ou"])
        if len(sps) >= 2: spine[gid] = {"sp": statistics.median(sps), "ou": statistics.median(ous) if len(ous) >= 2 else None}
    return spine

# ---------------------------------------------------------------- coaches
def coach_map():
    """(school, season) -> {coach_id, tenure_years_at_school_before, first_year}"""
    coaches = json.load(open(f"{DATA}/coaches_all.json"))
    out = {}
    for c in coaches:
        school_seasons = defaultdict(list)
        for s in c.get("seasons", []):
            school_seasons[s["school"]].append(s["year"])
        for school, years in school_seasons.items():
            yrs = sorted(years)
            for i, y in enumerate(yrs):
                prior = sum(1 for yy in yrs if yy < y)
                out[(school, y)] = {"coach": f"{c['firstName']} {c['lastName']}",
                                    "prior_years": prior,
                                    "first_year": prior == 0}
    return out

# ---------------------------------------------------------------- rest/bye
def rest_map(games):
    """team -> [(date, gid)] calendar; rest days entering each game."""
    cal = defaultdict(list)
    for g in games.values():
        d = g["startDate"][:10]
        cal[g["homeTeam"]].append((d, g["id"]))
        cal[g["awayTeam"]].append((d, g["id"]))
    for t in cal: cal[t].sort()
    rest = {}
    for t, lst in cal.items():
        for i, (d, gid) in enumerate(lst):
            days = 999 if i == 0 else (datetime.fromisoformat(d) - datetime.fromisoformat(lst[i-1][0])).days
            rest[gid] = rest.get(gid, {})
            key = "home" if any(gid == gg and dd == d for dd, gg in []) else None
            rest[gid][t] = days
    return rest, cal

def game_rest(games, cal):
    """per gid: home_rest, away_rest (days since that team's previous game)."""
    out = {}
    for t, lst in cal.items():
        for i, (d, gid) in enumerate(lst):
            days = 999 if i == 0 else (datetime.fromisoformat(d) - datetime.fromisoformat(lst[i-1][0])).days
            r = out.setdefault(gid, {})
            # home or away?
            g = games.get(gid)
            if g is None: continue
            r["home" if t == g["homeTeam"] else "away"] = days
    return out

# ---------------------------------------------------------------- travel
def travel_map(games, venues):
    vmap = {v["id"]: (v["latitude"], v["longitude"]) for v in venues if v.get("latitude")}
    out = {}
    for gid, g in games.items():
        hv, av = vmap.get(g.get("venueId")), vmap.get(g.get("venueId"))
        if g.get("neutralSite") or hv is None:
            # neutral: distance from each school's typical home venue unavailable -> skip
            out[gid] = None
            continue
        # road team travels from ITS previous game's venue — approximate with its
        # home venue (CFBD doesn't give team->venue map here; use venue of the road
        # team's previous home game if known, else skip)
        out[gid] = None  # placeholder; computed below with prev-venue logic
    # better: distance between the two teams' most recent home venues
    team_home_venue = defaultdict(dict)
    for g in games.values():
        team_home_venue[g["homeTeam"]][g["season"]] = g.get("venueId")
    for gid, g in games.items():
        if g.get("neutralSite"): continue
        hv = team_home_venue[g["homeTeam"]].get(g["season"])
        av = team_home_venue[g["awayTeam"]].get(g["season"])
        if hv and av and hv in vmap and av in vmap:
            out[gid] = haversine(*vmap[hv], *vmap[av])
    return out

# ---------------------------------------------------------------- weather
def weather_2025(games):
    """Open-Meteo archive: daily max wind, precip, temp per venue over 2025 season."""
    wpath = f"{DATA}/weather_2025.json"
    if os.path.exists(wpath):
        return json.load(open(wpath))
    ven_games = defaultdict(list)
    for g in games.values():
        if g["season"] != 2025 or g.get("neutralSite"): continue
        ven_games[g["venueId"]].append(g["startDate"][:10])
    venues = {v["id"]: v for v in json.load(open(f"{DATA}/venues.json"))}
    out = {}
    sess = urllib.request
    for i, (vid, dates) in enumerate(sorted(ven_games.items())):
        v = venues.get(vid)
        if not v or not v.get("latitude"): continue
        lo, hi = min(dates), max(dates)
        url = (f"https://archive-api.open-meteo.com/v1/archive?latitude={v['latitude']}"
               f"&longitude={v['longitude']}&start_date={lo}&end_date={hi}"
               f"&daily=wind_speed_10m_max,precipitation_sum,temperature_2m_max&timezone=auto")
        try:
            r = json.loads(sess.urlopen(url, timeout=20).read())
            days = r.get("daily", {})
            out[vid] = dict(zip(days.get("time", []),
                                zip(days.get("wind_speed_10m_max", []),
                                    days.get("precipitation_sum", []),
                                    days.get("temperature_2m_max", []))))
        except Exception as e:
            out[vid] = {}
        time.sleep(0.15)
        if i % 25 == 0: print(f"   weather pull {i}/{len(ven_games)} venues...", flush=True)
    json.dump(out, open(wpath, "w"))
    return out

# ---------------------------------------------------------------- reporting
def report(name, resid_sp, resid_ou, min_n=25):
    if len(resid_sp) < min_n:
        print(f"   {name:<46} n={len(resid_sp):>4} (too small)")
        return None
    m, s = statistics.mean(resid_sp), statistics.stdev(resid_sp)
    t = m / (s / math.sqrt(len(resid_sp)))
    line = f"   {name:<46} n={len(resid_sp):>4}  margin-resid {m:>+6.2f} ± {s/math.sqrt(len(resid_sp)):.2f} (t={t:+.2f})"
    if resid_ou:
        mo = statistics.mean(resid_ou)
        so = statistics.stdev(resid_ou) / math.sqrt(len(resid_ou))
        line += f"  | total-resid {mo:>+6.2f} ± {so:.2f}"
    print(line)
    return {"n": len(resid_sp), "t": round(t, 2), "margin_resid": round(m, 2)}

def main():
    print("[LOAD]", flush=True)
    games = load_games()
    spine = load_closes(games)
    print(f"  {len(games)} games, {len(spine)} with close spine")

    cm = coach_map()
    print(f"  {len(cm)} school-seasons under a mapped coach")

    # ---- A. COACHES
    print("\nA) COACHES — first-year and tenure effects (residual vs close)")
    resA = {}
    buckets = defaultdict(lambda: ([], []))
    for gid, g in games.items():
        if gid not in spine or spine[gid]["sp"] is None: continue
        margin = g["homePoints"] - g["awayPoints"]
        ou = g["homePoints"] + g["awayPoints"]
        for side, team in (("home", g["homeTeam"]), ("away", g["awayTeam"])):
            c = cm.get((team, g["season"]))
            if not c: continue
            sign = 1 if side == "home" else -1
            o = (ou - spine[gid]["ou"]) if spine[gid]["ou"] else None
            if c["first_year"]:
                buckets["first-year coach"][0].append(sign * (margin - spine[gid]["sp"]))
                if o is not None: buckets["first-year coach"][1].append(o)
            else:
                b = "tenure 2-3y" if c["prior_years"] <= 3 else "tenure 4-6y" if c["prior_years"] <= 6 else "tenure 7y+"
                buckets[b][0].append(sign * (margin - spine[gid]["sp"]))
                if o is not None: buckets[b][1].append(o)
    for b, (sp, ou) in sorted(buckets.items()):
        resA[b] = report(b, sp, ou)

    # ---- B. REST / BYE
    print("\nB) REST — bye weeks and short rest (residual vs close)")
    cal = defaultdict(list)
    for g in games.values():
        d = g["startDate"][:10]
        cal[g["homeTeam"]].append((d, g["id"], "home"))
        cal[g["awayTeam"]].append((d, g["id"], "away"))
    for t in cal: cal[t].sort()
    rest = {}
    for t, lst in cal.items():
        for i, (d, gid, side) in enumerate(lst):
            days = 999 if i == 0 else (datetime.fromisoformat(d) - datetime.fromisoformat(lst[i-1][0])).days
            rest.setdefault(gid, {})[side] = days
    br = defaultdict(lambda: ([], []))
    for gid, g in games.items():
        if gid not in spine or spine[gid]["sp"] is None: continue
        r = rest.get(gid, {})
        margin = g["homePoints"] - g["awayPoints"]
        ou = g["homePoints"] + g["awayPoints"]
        for side in ("home", "away"):
            days = r.get(side)
            if days is None: continue
            sign = 1 if side == "home" else -1
            cls = "bye (>=12d)" if days >= 12 else "short (<=5d)" if days <= 5 else "normal"
            br[cls][0].append(sign * (margin - spine[gid]["sp"]))
            if spine[gid]["ou"]: br[cls][1].append(ou - spine[gid]["ou"])
    for k in ("bye (>=12d)", "short (<=5d)", "normal"):
        if k in br: report(f"{k} team", *br[k])

    # ---- C. TRAVEL
    print("\nC) TRAVEL — road-team distance (haversine, team home venues)")
    venues = json.load(open(f"{DATA}/venues.json"))
    tv = travel_map(games, venues)
    tb = defaultdict(lambda: ([], []))
    for gid, dist in tv.items():
        if not dist or gid not in spine or spine[gid]["sp"] is None: continue
        g = games[gid]
        margin = g["homePoints"] - g["awayPoints"]
        bucket = ("<200mi", 200, 500, 1000)
        cls = "<200mi" if dist < 200 else "200-500mi" if dist < 500 else "500-1000mi" if dist < 1000 else ">1000mi"
        tb[cls][0].append(margin - spine[gid]["sp"])
        if spine[gid]["ou"]: tb[cls][1].append((g["homePoints"] + g["awayPoints"]) - spine[gid]["ou"])
    for k in ("<200mi", "200-500mi", "500-1000mi", ">1000mi"):
        if k in tb: report(f"travel {k} (road team)", *tb[k])

    # ---- D. WEATHER (2025, measured)
    print("\nD) WEATHER — CFB coefficients from Open-Meteo archive, 2025 home games")
    wx = weather_2025(games)
    print(f"  {sum(1 for v in wx.values() if v)} venue-days mapped")
    wb = defaultdict(lambda: ([], []))
    for gid, g in games.items():
        if g["season"] != 2025 or g.get("neutralSite"): continue
        w = wx.get(str(g.get("venueId")), wx.get(g.get("venueId")))
        if not w: continue
        d = w.get(g["startDate"][:10])
        if not d or d[0] is None: continue
        wind, precip, tmax = d
        if gid not in spine or spine[gid]["sp"] is None: continue
        margin = g["homePoints"] - g["awayPoints"]
        ou = g["homePoints"] + g["awayPoints"]
        cls = ("calm <8mph" if wind < 8 else "breezy 8-15" if wind < 15 else "WINDY 15+ (mph)")
        wb[cls][0].append(margin - spine[gid]["sp"])
        wb[cls][1].append(ou - spine[gid]["ou"]) if spine[gid]["ou"] else None
    for k in ("calm <8mph", "breezy 8-15", "WINDY 15+ (mph)"):
        if k in wb: report(f"wind {k}", *wb[k])
    # rain
    rb = defaultdict(lambda: ([], []))
    for gid, g in games.items():
        if g["season"] != 2025 or g.get("neutralSite"): continue
        w = wx.get(str(g.get("venueId")), wx.get(g.get("venueId")))
        if not w: continue
        d = w.get(g["startDate"][:10])
        if not d or d[1] is None: continue
        if gid not in spine or spine[gid]["sp"] is None: continue
        cls = "dry" if d[1] < 2.0 else "RAIN (>=2mm day)"
        rb[cls][0].append(g["homePoints"] - g["awayPoints"] - spine[gid]["sp"])
        rb[cls][1].append((g["homePoints"] + g["awayPoints"]) - spine[gid]["ou"]) if spine[gid]["ou"] else None
    for k in ("dry", "RAIN (>=2mm day)"):
        if k in rb: report(k, *rb[k])

    print("\n[DOCTRINE] every t>=1.96 here enters FeatureRegistry as diagnostic,")
    print("           gated walk-forward before any weight touches the margin head.")

if __name__ == "__main__":
    main()
