#!/usr/bin/env python3
"""
nfl_pbp_baseline.py — THE NFL MOTHER LODE, streaming-computed.
nflfastR pbp (2023-2026) -> team efficiency tables + quarter fatigue curve.
Streaming: row-by-row dict parse, no full-season lists.
"""
import csv, gzip, statistics, json
from collections import defaultdict

DATA = "/var/minis/workspace/nfl/data"
SEASONS = [2023, 2024, 2025, 2026]
F = lambda x: float(x) if x not in ("", "NA", None) else None

def stream(season):
    with gzip.open(f"{DATA}/pbp_{season}.csv.gz", "rt") as f:
        for row in csv.DictReader(f):
            yield row

def main():
    for season in SEASONS:
        try:
            eff = defaultdict(lambda: {"plays": 0, "epa": 0.0, "dropback_plays": 0,
                                       "dropback_epa": 0.0, "rush_plays": 0, "rush_epa": 0.0,
                                       "air": 0.0, "att": 0, "cpoe": 0.0, "cpoe_n": 0,
                                       "succ": 0, "succ_n": 0, "pass": 0,
                                       "wpa": 0.0})
            qtr = defaultdict(lambda: defaultdict(lambda: [0.0, 0.0, 0]))  # team->qtr->[epa, pts, n]
            n_rows = 0
            for r in stream(season):
                if r.get("season_type") != "REG" or not r.get("posteam"):
                    continue
                n_rows += 1
                t = r["posteam"]
                epa, wpa = F(r.get("epa")), F(r.get("wpa"))
                pt = r.get("play_type") or ""
                e = eff[t]
                if epa is not None and pt in ("run", "pass"):
                    e["plays"] += 1; e["epa"] += epa
                    e["succ_n"] += 1; e["succ"] += 1 if r.get("success") == "1" else 0
                    if pt == "pass":
                        e["pass"] += 1
                        if F(r.get("air_yards")) is not None and r.get("pass_attempt") == "1":
                            e["att"] += 1; e["air"] += F(r["air_yards"])
                        c = F(r.get("cpoe"))
                        if c is not None: e["cpoe"] += c; e["cpoe_n"] += 1
                    else:
                        e["rush_plays"] += 1
                if wpa is not None and pt in ("run", "pass"):
                    e["wpa"] += wpa
                if pt == "pass" or (pt == "run"):
                    db = (pt == "pass") or (r.get("qb_scramble") == "1")
                    if db: e["dropback_plays"] += 1
                    else: e["rush_plays"] += 1
                    if epa is not None:
                        if db: e["dropback_epa"] += epa
                        else: e["rush_epa"] += epa
                # quarter curve: EPA + scoring
                q = r.get("qtr")
                if q in ("1", "2", "3", "4") and epa is not None and pt in ("run", "pass"):
                    qe = qtr[t][q]
                    qe[0] += epa; qe[2] += 1
                if r.get("touchdown") == "1" and q in ("1", "2", "3", "4"):
                    qtr[t][q][1] += 7.0
                elif r.get("field_goal_result") == "made" and q in ("1", "2", "3", "4"):
                    qtr[t][q][1] += 3.0

            # write team efficiency
            rows = []
            for t, e in eff.items():
                if e["plays"] < 200: continue
                rows.append({"season": season, "team": t,
                             "epa_per_play": round(e["epa"] / e["plays"], 4),
                             "dropback_epa": round(e["dropback_epa"] / max(1, e["dropback_plays"]), 4),
                             "rush_epa": round(e["rush_epa"] / max(1, e["rush_plays"]), 4),
                             "success_rate": round(e["succ"] / max(1, e["succ_n"]), 4),
                             "air_yards_att": round(e["air"] / max(1, e["att"]), 2),
                             "cpoe": round(e["cpoe"] / max(1, e["cpoe_n"]), 3),
                             "pass_rate": round(e["pass"] / e["plays"], 3),
                             "wpa_total": round(e["wpa"], 2),
                             "n_plays": e["plays"]})
            rows.sort(key=lambda x: -x["epa_per_play"])
            with open(f"{DATA}/nfl_team_efficiency_{season}.csv", "w", newline="") as f:
                w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
            # defense: reuse same stream? second pass would double time; derive def from
            # total_epa later. For now offense-only + quarter curve.
            with open(f"{DATA}/nfl_quarter_curve_{season}.csv", "w", newline="") as f:
                w = csv.writer(f); w.writerow(["team", "qtr", "epa_per_play", "pts", "n_plays"])
                for t in sorted(qtr):
                    for q in ("1", "2", "3", "4"):
                        epa, pts, n = qtr[t][q]
                        w.writerow([t, q, round(epa / max(1, n), 4), pts, n])
            print(f"[{season}] {n_rows:,} plays | top EPA/play: "
                  + ", ".join(f"{r['team']} {r['epa_per_play']:+.3f}" for r in rows[:5])
                  + f" | saved {len(rows)} teams")
        except FileNotFoundError:
            print(f"[{season}] no file, skipped")

if __name__ == "__main__":
    main()
