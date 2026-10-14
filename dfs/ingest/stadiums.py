#!/usr/bin/env python3
"""Stadium table for travel miles, timezone and altitude.  DIAGNOSTIC.

Sources (each field cites its own):
  - venue list: nflverse games.csv (stadium_id, stadium)  [CC-BY-4.0, nflverse/nfldata]
  - coordinates: Wikidata P625 (CC0), matched by exact English label or alias, restricted to
    items that are instances of (a subclass of) stadium Q483110 / sports venue Q1076486
  - timezone: NWS api.weather.gov /points/{lat},{lon} -> properties.timeZone (US public domain).
    Non-US venues: Wikidata P421 only if it is an IANA-style value; else null with reason.
  - altitude: USGS EPQS (epqs.nationalmap.gov, US public domain), metres. Non-US: null with reason.
Unmatched or ambiguous venues are emitted with null fields and a reason; nothing is typed by hand.
"""
import csv, json, math, os, sys, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _stamp import fetch, utcnow, write_stamped, sha256, FailClosed  # noqa: E402

WD = "https://query.wikidata.org/sparql?format=json&query="
Q = """SELECT ?s ?coord ?cc WHERE {{ VALUES ?n {{ {names} }}
 {{ ?s rdfs:label ?n }} UNION {{ ?s skos:altLabel ?n }}
 ?s wdt:P625 ?coord. ?s wdt:P31/wdt:P279* ?k. VALUES ?k {{ wd:Q483110 wd:Q1076486 wd:Q1154710 }}
 OPTIONAL {{ ?s wdt:P17 ?cc }} }}"""


def venues_from_games(games_csv, lo=2015):
    seen = {}
    for g in csv.DictReader(open(games_csv, encoding="utf-8")):
        if int(g["season"]) >= lo and g["stadium_id"] not in ("", "NA"):
            seen.setdefault(g["stadium_id"], set()).add(g["stadium"])
    return {k: sorted(v) for k, v in seen.items()}


def wikidata_coords(names):
    out = {}
    names = sorted(set(names))
    for i in range(0, len(names), 40):
        chunk = " ".join(json.dumps(n) + "@en" for n in names[i:i + 40])
        q = Q.format(names=chunk).replace("VALUES ?n", "VALUES ?n")
        q = "SELECT ?n ?s ?coord ?cc WHERE {" + q.split("WHERE {", 1)[1]
        r = json.loads(fetch(WD + urllib.parse.quote(q), headers={"Accept": "application/sparql-results+json"}))
        for b in r["results"]["bindings"]:
            n = b["n"]["value"]; lon, lat = b["coord"]["value"][6:-1].split()
            out.setdefault(n, {})[b["s"]["value"]] = {"lat": float(lat), "lon": float(lon),
                                                       "us": b.get("cc", {}).get("value", "").endswith("/Q30")}
    return out


def nws_tz(lat, lon):
    try:
        d = json.loads(fetch(f"https://api.weather.gov/points/{lat:.4f},{lon:.4f}", headers={"Accept": "application/geo+json"}))
        return d["properties"].get("timeZone")
    except (FailClosed, KeyError, ValueError):
        return None


def usgs_elev(lat, lon):
    try:
        d = json.loads(fetch(f"https://epqs.nationalmap.gov/v1/json?x={lon}&y={lat}&units=Meters&wkid=4326"))
        v = float(d["value"])
        return v if v > -1000 else None
    except (FailClosed, KeyError, ValueError, TypeError):
        return None


def haversine_miles(a, b):
    R = 3958.7613
    p1, p2 = math.radians(a[0]), math.radians(b[0]); dl = math.radians(b[1] - a[1])
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def build(games_csv, out_path):
    obs = utcnow()
    V = venues_from_games(games_csv)
    wd = wikidata_coords([n for ns in V.values() for n in ns])
    rows = []
    for sid, names in sorted(V.items()):
        cands = {}
        for n in names:
            cands.update(wd.get(n, {}))
        row = {"stadium_id": sid, "names": names, "lat": None, "lon": None, "timezone": None,
               "altitude_m": None, "wikidata": None, "reason": None,
               "sources": {"coords": "Wikidata P625 (CC0)", "timezone": "NWS /points timeZone (public domain)",
                           "altitude": "USGS EPQS (public domain)"}}
        if len(cands) > 1:  # deterministic tiebreak: all candidates within 5 miles = same site
            pts = list(cands.values())
            if all(haversine_miles((a["lat"], a["lon"]), (b["lat"], b["lon"])) <= 5 for a in pts for b in pts):
                q0 = sorted(cands)[0]; cands = {q0: cands[q0]}
        if len(cands) != 1:
            row["reason"] = "no Wikidata stadium match" if not cands else f"ambiguous: {len(cands)} Wikidata stadium items"
            rows.append(row); continue
        (qid, c), = cands.items()
        row.update(lat=c["lat"], lon=c["lon"], wikidata=qid)
        if c["us"]:
            row["timezone"] = nws_tz(c["lat"], c["lon"]); row["altitude_m"] = usgs_elev(c["lat"], c["lon"])
            if row["timezone"] is None or row["altitude_m"] is None:
                row["reason"] = "NWS/USGS lookup failed for some field"
        else:
            row["reason"] = "non-US venue: NWS/USGS do not cover it; timezone/altitude left null"
        rows.append(row)
    src = open(games_csv, "rb").read()
    return write_stamped(out_path, rows, observed_at=obs, source="nflverse games.csv + Wikidata + NWS + USGS",
                         games_csv_sha256=sha256(src), n_venues=len(rows),
                         n_complete=sum(1 for r in rows if r["lat"] is not None and r["timezone"] and r["altitude_m"] is not None))


if __name__ == "__main__":
    d = build(sys.argv[1] if len(sys.argv) > 1 else "/workspace/games.csv",
              sys.argv[2] if len(sys.argv) > 2 else "/workspace/nflverse_cache/stadiums.json")
    print(d["n_venues"], "venues;", d["n_complete"], "complete")
    for r in d["rows"]:
        if r["reason"]: print(" ", r["stadium_id"], r["names"], r["reason"])
