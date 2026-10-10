#!/usr/bin/env python3
"""officials_fast.py — crew tendencies, single pass, 2025 only (fast, stdlib)."""
import csv, gzip, statistics, json
from collections import defaultdict
DATA = "/var/minis/workspace/nfl/data"
refs = {}
for r in csv.DictReader(open(f"{DATA}/officials.csv")):
    if r["season"] == "2025" and r["position"].lower().startswith("ref"):
        refs[r["game_key"]] = r["official_name"]
print(f"[REFS 2025] {len(refs)} games mapped")
totals = {}
for r in csv.DictReader(open(f"{DATA}/games_all.csv")):
    if r["season"] == "2025" and r["game_type"] == "REG" and r["home_score"]:
        t = int(r["home_score"]) + int(r["away_score"])
        totals[r["old_game_id"]] = t; totals[r["game_id"]] = t
crew = defaultdict(lambda: [0, 0, 0, 0.0])   # g, pen, presnap, pts
PRESNAP = ("false start", "delay of game", "offside", "neutral zone", "illegal formation", "illegal shift", "illegal motion")
gstat = defaultdict(lambda: [0, 0])
with gzip.open(f"{DATA}/pbp_2025.csv.gz", "rt") as f:
    for row in csv.DictReader(f):
        if row.get("season_type") != "REG": continue
        if row.get("penalty") == "1":
            gk = row.get("game_key") or row.get("game_id")
            gstat[gk][0] += 1
            pt = (row.get("penalty_type") or "").lower()
            if any(p in pt for p in PRESNAP): gstat[gk][1] += 1
for gk, (pen, ps) in gstat.items():
    ref, tot = refs.get(gk), totals.get(gk)
    if not ref or tot is None: continue
    c = crew[ref]; c[0] += 1; c[1] += pen; c[2] += ps; c[3] += tot
rows = []
for ref, (g, pen, ps, pts) in crew.items():
    if g < 12: continue
    rows.append({"referee": ref, "games": g, "pen_pg": round(pen / g, 2),
                 "presnap_share": round(ps / max(1, pen), 3), "total_pts_pg": round(pts / g, 1)})
rows.sort(key=lambda r: -r["pen_pg"])
print(f"[CREWS n>=12] {len(rows)} refs (2025)")
print("most penalized:", ", ".join(f"{r['referee']} {r['pen_pg']:.1f} (n={r['games']})" for r in rows[:4]))
print("least penalized:", ", ".join(f"{r['referee']} {r['pen_pg']:.1f}" for r in rows[-4:]))
rows2 = sorted(rows, key=lambda r: r["presnap_share"]); q = max(1, len(rows2) // 4)
for i in range(4):
    grp = rows2[i * q:(i + 1) * q]
    if grp: print(f"  pre-snap Q{i+1}: mean total {statistics.mean([r['total_pts_pg'] for r in grp]):.1f} ({len(grp)} refs, share {grp[0]['presnap_share']:.2f}-{grp[-1]['presnap_share']:.2f})")
json.dump(rows, open(f"{DATA}/officials_crews.csv", "w"), indent=1)
print("saved")
