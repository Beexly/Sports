#!/usr/bin/env python3
"""
cfb_drive_efficiency.py — items 3+4 of the build order:
team game stats -> season averages; drives -> drive efficiency + start-position
adjusted metrics + tempo priors. FBS filter, join keys preserved.
"""
import json, statistics, csv
from collections import defaultdict
from freshness_gate import load_stamped

DATA = "/var/minis/workspace/cfb/data"
YEARS = [2024, 2025, 2026]

def fbs_set():
    return {t["school"] for t in load_stamped(f"{DATA}/teams_fbs.json")}

def main():
    fbs = fbs_set()
    # ---- team game stats -> season averages
    for y in YEARS:
        try:
            rows = load_stamped(f"{DATA}/cfb_teamgamelog_{y}.json")
        except FileNotFoundError:
            continue
        agg = defaultdict(lambda: defaultdict(list))
        for g in rows:
            for side in ("homeTeams", "awayTeams"):
                for ts in g.get(side, []):
                    t = ts.get("school")
                    if t not in fbs: continue
                    st = ts.get("stats", [])
                    m = {x["category"]: x.get("stat") for x in st if isinstance(x, dict)}
                    for cat, v in m.items():
                        try: agg[t][cat].append(float(v))
                        except (TypeError, ValueError): pass
        out = []
        for t, cats in agg.items():
            row = {"season": y, "team": t, "n_games": len(cats.get("totalYards", []))}
            for cat in ("totalYards", "netPassingYards", "rushingYards", "points",
                        "turnovers", "thirdDownConversions", "thirdDowns",
                        "fourthDownConversions", "fourthDowns", "possessionTime"):
                vals = cats.get(cat, [])
                if vals:
                    row[cat + "_pg"] = round(statistics.mean(vals), 2)
            out.append(row)
        out.sort(key=lambda r: -(r.get("totalYards_pg") or 0))
        if out:
            with open(f"{DATA}/cfb_team_season_stats_{y}.csv", "w", newline="") as f:
                w = csv.DictWriter(f, fieldnames=list(out[0].keys())); w.writeheader(); w.writerows(out)
            top = [f"{r['team']} {r.get('totalYards_pg',0):.0f}" for r in out[:5]]
            print(f"[{y}] team stats: {len(out)} FBS teams | top YPG: {', '.join(top)}")

    # ---- drives -> efficiency + field position + tempo
    for y in YEARS:
        try:
            dr = load_stamped(f"{DATA}/cfb_drives_{y}.json")
        except FileNotFoundError:
            continue
        per = defaultdict(lambda: {"n": 0, "yards": 0.0, "pts": 0, "start_ytg": [],
                                   "plays": 0, "dur": 0.0, "games": set()})
        for d in dr:
            off, dfn = d.get("offense"), d.get("defense")
            if off not in fbs: continue
            p = per[off]
            p["n"] += 1
            p["yards"] += d.get("yards") or 0
            # points via score delta (drives carry no points field)
            p["pts"] += max(0, (d.get("endOffenseScore") or 0) - (d.get("startOffenseScore") or 0))
            p["plays"] += d.get("plays") or 0
            if d.get("startYardsToGoal") is not None:
                p["start_ytg"].append(d["startYardsToGoal"])
            el = d.get("elapsed")
            if isinstance(el, dict):
                p["dur"] += (el.get("minutes") or 0) * 60 + (el.get("seconds") or 0)
            p["games"].add(d.get("gameId"))
        out = []
        for t, p in per.items():
            if p["n"] < 40: continue
            out.append({"season": y, "team": t, "games": len(p["games"]), "drives": p["n"],
                        "drives_per_game": round(p["n"] / max(1, len(p["games"])), 2),
                        "yards_per_drive": round(p["yards"] / p["n"], 2),
                        "points_per_drive": round(p["pts"] / p["n"], 3),
                        "plays_per_drive": round(p["plays"] / p["n"], 2),
                        "avg_start_ytg": round(statistics.mean(p["start_ytg"]), 1) if p["start_ytg"] else None,
                        "sec_per_drive": round(p["dur"] / p["n"], 1) if p["dur"] else None})
        out.sort(key=lambda r: -r["points_per_drive"])
        with open(f"{DATA}/cfb_drive_efficiency_{y}.csv", "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(out[0].keys())); w.writeheader(); w.writerows(out)
        top = [f"{r['team']} {r['points_per_drive']:.2f}" for r in out[:5]]
        print(f"[{y}] drives: {len(dr):,} | teams: {len(out)} | top PPD: {', '.join(top)}")

    # ---- usage
    for y in (2025, 2026):
        try:
            us = load_stamped(f"{DATA}/cfb_usage_{y}.json")
        except FileNotFoundError:
            continue
        rows = sorted([u for u in us if u.get("team") in fbs
                       and isinstance(u.get("usage"), dict)
                       and (u["usage"].get("overall") or 0) > 0],
                      key=lambda u: -(u["usage"].get("overall") or 0))
        with open(f"{DATA}/cfb_usage_{y}.csv", "w", newline="") as f:
            if rows:
                keys = ["season", "name", "position", "team"]
                u0 = rows[0]["usage"]
                keys += [f"usage_{k}" for k in u0.keys()]
                w = csv.DictWriter(f, fieldnames=keys)
                w.writeheader()
                for u in rows:
                    row = {k: u.get(k) for k in ("season", "name", "position", "team")}
                    for k, v in (u.get("usage") or {}).items():
                        row[f"usage_{k}"] = v
                    w.writerow(row)
        print(f"[{y}] usage: {len(rows)} players saved")

if __name__ == "__main__":
    main()
