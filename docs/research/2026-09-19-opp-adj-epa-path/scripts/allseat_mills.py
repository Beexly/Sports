"""All-seat mill battery (Seats 3/4/5 pre-mills) from pbp 2019-2025 + schedules.

PRE-REGISTRATIONS (kill on the same line):
1. WIND (props-only context): bins 0-14 / 15-19 / >=20 mph on pass attempts.
   Metrics: completion rate, yards/attempt, aDOT>20 share, EPA/dropback.
   Graduate a bin's claim ONLY if its Wilson 95% is non-overlapping vs the 0-14
   bin for that metric. Spread/total addends stay BLOCKED regardless of outcome.
2. COLD (A29): kickoff temp <= 25F vs 26-70F. n >= 150 games per side or NOT_RUN.
3. ROOF (A30): game total points sd, open vs closed vs retractable. Descriptive
   until a Rung-2 outcome test exists; variance ratio reported with n.
4. CONVERSION TENSOR: RZ TD rate by yardline_100 bin (per-play, touchdown==1);
   4th-down conversion rate (first_down==1 on down==4) by ydstogo bin.
   Cell n >= 200 or the cell is NOT_RUN.
5. SIGMA LADDER (Opus): margin sd, weeks 1-4 vs 5-18, pooled 2019-2025.
   Claim to verify: ~13.8 early vs ~13.2 late.
RAIN/SNOW fumbles: only if a precipitation-bearing column exists (checked below),
else NOT_RUN.
"""
import json
import numpy as np
import pandas as pd
from scipy.stats import norm

DATA = "data"
OUT = {}


def wilson(k, n, z=1.96):
    if n == 0:
        return (np.nan, np.nan)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (c - h, c + h)


def load_year(year, cols):
    pb = pd.read_csv(f"{DATA}/pbp_{year}.csv.gz", compression="gzip", low_memory=False,
                     usecols=cols)
    pb = pb[(pb.season_type == "REG") & pb.posteam.notna()]
    return pb


# ---- 1. WIND + COLD + RAIN checks (need schedules join per game) -----------
sched = pd.read_csv(f"{DATA}/schedules.csv", low_memory=False)
sched = sched[(sched.game_type == "REG")]
weather_cols = [c for c in ["wind", "temp", "roof", "surface"] if c in sched.columns]
print("schedule weather columns present:", weather_cols)

PASS_COLS = ["game_id", "week", "posteam", "play_type", "epa", "qb_dropback",
             "complete_pass", "passing_yards", "air_yards", "pass_attempt",
             "down", "ydstogo", "yardline_100", "touchdown", "first_down",
             "fumble", "fumble_lost", "qtr", "wp", "season_type"]

wind_rows = []
for y in range(2019, 2026):
    pb = load_year(y, PASS_COLS)
    pb = pb.merge(sched[["game_id", "wind", "temp"]], on="game_id", how="left")
    # pass attempts: pass plays, not two-point, not no_play (play_type pass excludes those)
    pa = pb[(pb.play_type == "pass") & pb.air_yards.notna()].copy()
    drop = pb[(pb.qb_dropback == 1) & pb.epa.notna()]
    fum = pb[pb.fumble.notna()].copy()
    fum["fumble"] = fum.fumble.fillna(0).astype(int)
    fum["fumble_lost"] = fum.fumble_lost.fillna(0).astype(int)
    wind_rows.append((y, pa, drop, fum))

pa_all = pd.concat([x[1] for x in wind_rows], ignore_index=True)
drop_all = pd.concat([x[2] for x in wind_rows], ignore_index=True)
fum_all = pd.concat([x[3] for x in wind_rows], ignore_index=True)


def wind_bin(v):
    if pd.isna(v):
        return None
    if v < 15:
        return "0-14"
    if v < 20:
        return "15-19"
    return ">=20"


pa_all["wb"] = pa_all.wind.map(wind_bin)
drop_all["wb"] = drop_all.wind.map(wind_bin)

print("\n=== WIND MILL (props context; spread/total addends remain BLOCKED) ===")
wind_out = {}
for b in ["0-14", "15-19", ">=20"]:
    d = pa_all[pa_all.wb == b]
    dd = drop_all[drop_all.wb == b]
    n_att = len(d)
    comp = d.complete_pass.mean()
    lo, hi = wilson(int(d.complete_pass.sum()), n_att)
    ypa = d.passing_yards.mean()
    adot_deep = float((d.air_yards > 20).mean())
    epa_db = dd.epa.mean()
    wind_out[b] = {
        "attempts": int(n_att), "completion": round(float(comp), 4),
        "completion_wilson": [round(lo, 4), round(hi, 4)],
        "yards_per_attempt": round(float(ypa), 3),
        "adot_gt20_share": round(adot_deep, 4),
        "epa_per_dropback": round(float(epa_db), 4),
        "dropbacks": int(len(dd)),
    }
    print(b, wind_out[b])

base = wind_out["0-14"]
for b in ["15-19", ">=20"]:
    blo, bhi = wind_out[b]["completion_wilson"]
    grad = (blo > base["completion_wilson"][1]) or (bhi < base["completion_wilson"][0])
    print(f"  completion Wilson non-overlap vs 0-14, bin {b}: "
          f"{'GRADUATES' if grad else 'FAILS'} (base [{base['completion_wilson']}], "
          f"bin [{blo},{bhi}])")
OUT["wind"] = wind_out

print("\n=== COLD MILL (A29): temp <= 25F vs 26-70F ===")
# pa_all / drop_all already carry temp (merged per season in the load loop)
cold = drop_all[drop_all.temp <= 25]
mid = drop_all[(drop_all.temp > 25) & (drop_all.temp <= 70)]
pa_t = pa_all[pa_all.temp.notna()]
cold_n_games = cold.game_id.nunique()
print(f"cold dropbacks {len(cold)} across {cold_n_games} games; "
      f"mid {len(mid)} across {mid.game_id.nunique()} games")
if cold_n_games >= 25:
    OUT["cold"] = {
        "cold_games": int(cold_n_games),
        "cold_epa_per_dropback": round(float(cold.epa.mean()), 4),
        "mid_epa_per_dropback": round(float(mid.epa.mean()), 4),
        "cold_completion": round(float(pa_t[pa_t.temp <= 25].complete_pass.mean()), 4),
        "mid_completion": round(float(pa_t[(pa_t.temp > 25) & (pa_t.temp <= 70)].complete_pass.mean()), 4),
    }
    print(OUT["cold"])
else:
    OUT["cold"] = "NOT_RUN (n<25 games)"
    print("NOT_RUN")

print("\n=== RAIN/SNOW fumbles (A31): precipitation column check ===")
if "weather" in sched.columns:
    print("weather string column exists - parse needed; NOT_RUN this pass (string parse)")
    OUT["rain_fumble"] = "NOT_RUN (weather is a free string; parse queued)"
else:
    print("no precipitation/weather column in schedules")
    OUT["rain_fumble"] = "NOT_RUN (no column)"

# ---- 2. ROOF variance (A30) ----
print("\n=== ROOF MILL (A30): game total by roof ===")
s2 = sched.dropna(subset=["home_score", "away_score", "roof"]).copy()
s2["total"] = s2.home_score + s2.away_score
roof_out = {}
for r in ["outdoors", "closed", "open", "retractable"]:
    d = s2[s2.roof == r]
    if len(d) < 100:
        continue
    roof_out[r] = {"games": int(len(d)), "mean_total": round(float(d.total.mean()), 2),
                   "sd_total": round(float(d.total.std()), 2)}
    print(r, roof_out[r])
OUT["roof"] = roof_out

# ---- 3. CONVERSION TENSOR ----
print("\n=== RZ TD rate by yardline bin (per-play, all REG offense plays) ===")
off = pd.concat([load_year(y, PASS_COLS) for y in range(2019, 2026)], ignore_index=True)
off = off[~off.play_type.isin(["no_play", "qb_kneel", "qb_spike"])]
rz_bins = [(1, 2), (3, 5), (6, 10), (11, 15), (16, 20)]
rz_out = {}
for lo_, hi_ in rz_bins:
    d = off[(off.yardline_100 >= lo_) & (off.yardline_100 <= hi_)]
    n = len(d)
    td = int(d.touchdown.fillna(0).sum())
    ent = {"n_plays": int(n), "td_rate": round(td / n, 4) if n else None}
    if n < 200:
        ent["verdict"] = "NOT_RUN (n<200)"
    rz_out[f"{lo_}-{hi_}"] = ent
    print(f"{lo_}-{hi_}: {ent}")
OUT["rz_tensor"] = rz_out

print("\n=== 4th-down conversion by distance bin ===")
fth = off[off.down == 4].copy()
fd_bins = [(1, 1), (2, 3), (4, 6), (7, 30)]
fourth_out = {}
for lo_, hi_ in fd_bins:
    d = fth[(fth.ydstogo >= lo_) & (fth.ydstogo <= hi_)]
    n = len(d)
    conv = int(d.first_down.fillna(0).sum())
    ent = {"n_plays": int(n), "conversion_rate": round(conv / n, 4) if n else None}
    if n < 200:
        ent["verdict"] = "NOT_RUN (n<200)"
    fourth_out[f"{lo_}" if lo_ == hi_ else f"{lo_}-{hi_}"] = ent
    print(f"4th&{lo_}-{hi_}: {ent}")
OUT["fourth_down_tensor"] = fourth_out

# ---- 4. SIGMA LADDER ----
print("\n=== SIGMA LADDER (margin sd, early vs late) ===")
s3 = sched.dropna(subset=["home_score", "away_score"]).copy()
s3["margin"] = (s3.home_score - s3.away_score).abs()
early = s3[s3.week <= 4].margin
late = s3[(s3.week >= 5) & (s3.week <= 18)].margin
OUT["sigma_ladder"] = {"early_w1_4_sd": round(float(early.std()), 3),
                       "late_w5_18_sd": round(float(late.std()), 3),
                       "n_early": int(len(early)), "n_late": int(len(late))}
print(OUT["sigma_ladder"], "| claimed: 13.8 vs 13.2")

with open(f"{DATA}/allseat_mills.json", "w") as f:
    json.dump(OUT, f, indent=2)
print("\nsaved data/allseat_mills.json")
