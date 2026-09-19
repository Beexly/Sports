"""All-seat mill battery v2 - definitional fixes:
- 4th-down conversions: play_type in (pass, run) ONLY (FG/punt attempts excluded);
  conversion = first_down==1 OR touchdown==1 (a TD on 4th down IS a conversion).
- RZ tensor, two bases: (a) TD rate per pass/run snap from that yardline bin;
  (b) TD rate per DRIVE STARTING in the bin (fixed_drive_result == 'Touchdown').
- Sigma ladder: SIGNED margin sd (sign-invariant sd, correct basis for the claim).
"""
import json
import numpy as np
import pandas as pd

DATA = "data"
OUT = {}

sched = pd.read_csv(f"{DATA}/schedules.csv", low_memory=False)
s3 = sched[(sched.game_type == "REG")].dropna(subset=["home_score", "away_score"]).copy()
s3["margin"] = s3.home_score - s3.away_score
early = s3[s3.week <= 4].margin
late = s3[(s3.week >= 5) & (s3.week <= 18)].margin
OUT["sigma_ladder"] = {"early_w1_4_sd": round(float(early.std()), 3),
                       "late_w5_18_sd": round(float(late.std()), 3),
                       "n_early": int(len(early)), "n_late": int(len(late))}
print("=== SIGMA LADDER (signed margin sd) ===")
print(OUT["sigma_ladder"], "| claimed: 13.8 early vs 13.2 late")

COLS = ["game_id", "week", "posteam", "play_type", "epa", "qb_dropback",
        "down", "ydstogo", "yardline_100", "touchdown", "first_down",
        "fixed_drive", "fixed_drive_result", "drive_start_yard_line",
        "season_type"]
frames = []
for y in range(2019, 2026):
    pb = pd.read_csv(f"{DATA}/pbp_{y}.csv.gz", compression="gzip", low_memory=False,
                     usecols=COLS)
    frames.append(pb[(pb.season_type == "REG") & pb.posteam.notna()])
off = pd.concat(frames, ignore_index=True)
runs = off[off.play_type.isin(["pass", "run"])].copy()

print("\n=== RZ TD rate, per pass/run SNAP from yardline bin ===")
rz_out = {}
for lo_, hi_ in [(1, 2), (3, 5), (6, 10), (11, 15), (16, 20)]:
    d = runs[(runs.yardline_100 >= lo_) & (runs.yardline_100 <= hi_)]
    n = len(d)
    td = int(d.touchdown.fillna(0).sum())
    ent = {"n_snaps": int(n), "td_rate_per_snap": round(td / n, 4) if n else None}
    if n >= 200:
        ent["verdict"] = "OK"
    else:
        ent["verdict"] = "NOT_RUN (n<200)"
    rz_out[f"snap {lo_}-{hi_}"] = ent
    print(f"snap {lo_}-{hi_}: {ent}")

print("\n=== RZ TD rate, per DRIVE STARTING in bin (first-play yardline_100) ===")
drives = off.groupby("fixed_drive", as_index=False).first()
drives["dsl"] = pd.to_numeric(drives.yardline_100, errors="coerce")
drives = drives[drives.dsl.notna()]
for lo_, hi_ in [(1, 2), (3, 5), (6, 10), (11, 15), (16, 20)]:
    d = drives[(drives.dsl >= lo_) & (drives.dsl <= hi_)]
    n = len(d)
    td = int((d.fixed_drive_result == "Touchdown").sum())
    ent = {"n_drives": int(n), "td_rate_per_drive": round(td / n, 4) if n else None}
    if n < 200:
        ent["verdict"] = "NOT_RUN (n<200)"
    rz_out[f"drive {lo_}-{hi_}"] = ent
    print(f"drive {lo_}-{hi_}: {ent}")
OUT["rz_tensor"] = rz_out

print("\n=== 4th-down conversion by distance (pass/run attempts only; TD counts) ===")
fth = runs[runs.down == 4].copy()
fth["converted"] = ((fth.first_down.fillna(0) == 1) | (fth.touchdown.fillna(0) == 1)).astype(int)
fourth_out = {}
for name, lo_, hi_ in [("4th&1", 1, 1), ("4th&2-3", 2, 3), ("4th&4-6", 4, 6), ("4th&7+", 7, 99)]:
    d = fth[(fth.ydstogo >= lo_) & (fth.ydstogo <= hi_)]
    n = len(d)
    ent = {"n_attempts": int(n), "conversion_rate": round(float(d.converted.mean()), 4) if n else None}
    if n < 200:
        ent["verdict"] = "NOT_RUN (n<200)"
    fourth_out[name] = ent
    print(f"{name}: {ent}")
OUT["fourth_down_tensor"] = fourth_out

with open(f"{DATA}/allseat_mills_v2.json", "w") as f:
    json.dump(OUT, f, indent=2)
print("\nsaved data/allseat_mills_v2.json")
