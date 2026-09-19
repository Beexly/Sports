"""NEW-AREAS battery: market self-calibration, referee crews, rest differential,
surface, primetime, division games, penalty persistence.

PRE-REGISTRATIONS:
1. MARKET CALIBRATION (the benchmark measurement): de-vigged two-way implied prob
   from closing moneylines vs realized outcomes, binned. Report Brier + log-loss
   per bin. No kill - this MEASURES the benchmark itself. Sub-test (prediction):
   favorite-longshot bias exists (long bins underperform implied). If absent, the
   close is even stronger than doctrine says.
2. REFEREE CREWS: penalty yards per game by crew, crews with n>=30 games.
   Descriptive dispersion + totals impact. Pre-stated eyeball bar: crew spread
   > 15 pen-yards/game = flag as a thin-market totals angle worth Rung-2.
3. REST DIFFERENTIAL: home_rest - away_rest buckets -> mean home margin.
   Doctrine: coefficient ~0 (bye-edge vanished post-2011). Verify slope.
4. SURFACE (A27 partial): scoring total by surface family (artificial vs grass).
   Injury effects NOT_RUN (no injury column).
5. PRIMETIME (Batch 9 pre-mill): Thu/Sun-night/Mon vs Sun-day: totals + |margin|.
6. DIVISION GAMES: folk-wisdom check (division = closer + lower scoring).
7. PENALTY PERSISTENCE (factor candidate): team-game penalty yards W1-8 -> W9-18
   Spearman. Pre-stated: > 0.15 = partially skill, factor candidate; < 0.15 dead.
"""
import json
import numpy as np
import pandas as pd
from scipy.stats import spearmanr

DATA = "data"
OUT = {}
sched = pd.read_csv(f"{DATA}/schedules.csv", low_memory=False)
s = sched[(sched.game_type == "REG")].dropna(
    subset=["home_score", "away_score", "spread_line"]).copy()
s["margin"] = s.home_score - s.away_score
s["total"] = s.home_score + s.away_score


def implied(odds):
    o = float(odds)
    return 100.0 / (100.0 + abs(o)) if o > 0 else abs(o) / (abs(o) + 100.0)


# ---- 1. MARKET SELF-CALIBRATION (home-side two-way) ----
print("=== MARKET CALIBRATION: de-vigged home implied prob vs outcome (2019-2025) ===")
cal = s.dropna(subset=["home_moneyline", "away_moneyline"]).copy()
cal["imp_home_raw"] = cal.home_moneyline.map(implied)
cal["imp_away_raw"] = cal.away_moneyline.map(implied)
cal["overround"] = cal.imp_home_raw + cal.imp_away_raw
cal["p_home"] = cal.imp_home_raw / cal.overround
cal["home_win"] = (cal.margin > 0).astype(float)
bins = [(0.30, 0.40), (0.40, 0.50), (0.50, 0.60), (0.60, 0.70), (0.70, 0.85), (0.85, 1.0)]
cal_rows = []
for lo, hi in bins:
    d = cal[(cal.p_home >= lo) & (cal.p_home < hi)]
    if len(d) < 50:
        continue
    realized = float(d.home_win.mean())
    avg_imp = float(d.p_home.mean())
    k, n = int(d.home_win.sum()), len(d)
    lo95, hi95 = (realized - 1.96 * np.sqrt(realized * (1 - realized) / n),
                  realized + 1.96 * np.sqrt(realized * (1 - realized) / n))
    brier = float(np.mean((d.p_home - d.home_win) ** 2))
    cal_rows.append({"bin": f"{lo:.2f}-{hi:.2f}", "n": n, "implied": round(avg_imp, 4),
                     "realized": round(realized, 4), "wil95": [round(lo95, 4), round(hi95, 4)],
                     "brier": round(brier, 4)})
    print(cal_rows[-1])
brier_all = float(np.mean((cal.p_home - cal.home_win) ** 2))
ll = float(-np.mean(cal.home_win * np.log(cal.p_home) + (1 - cal.home_win) * np.log(1 - cal.p_home)))
OUT["market_calibration"] = {"bins": cal_rows, "brier_overall": round(brier_all, 4),
                             "logloss_overall": round(ll, 4), "mean_overround": round(float(cal.overround.mean()), 4)}
print(f"OVERALL: Brier {brier_all:.4f}  logloss {ll:.4f}  mean overround {cal.overround.mean():.4f}")

# favorite-longshot sub-test on AWAY big underdogs (implied <= 0.35)
dog = cal[cal.p_home <= 0.35]
long_dog = cal[(cal.p_home <= 0.30) & (cal.p_home >= 0.20)]
if len(long_dog):
    r = float(long_dog.home_win.mean())
    print(f"home implied 20-30% bin: realized {r:.4f} on n={len(long_dog)} "
          f"({'bias present' if r < long_dog.p_home.mean() else 'no bias'})")

# ---- 2. REST DIFFERENTIAL ----
print("\n=== REST DIFFERENTIAL (home_rest - away_rest -> home margin) ===")
r = s.dropna(subset=["home_rest", "away_rest"]).copy()
r["rest_diff"] = r.home_rest - r.away_rest
buckets = [("away -2 or more", -99, -2), ("away -1..home +1", -1, 1),
           ("home +2..+4", 2, 4), ("home +5 or more", 5, 99)]
rest_out = []
for name, lo, hi in buckets:
    d = r[(r.rest_diff >= lo) & (r.rest_diff <= hi)]
    rest_out.append({"bucket": name, "n": int(len(d)),
                     "mean_home_margin": round(float(d.margin.mean()), 2)})
    print(rest_out[-1])
slope = float(np.polyfit(r.rest_diff, r.margin, 1)[0])
OUT["rest"] = {"buckets": rest_out, "slope_pts_per_rest_day": round(slope, 3)}
print(f"slope: {slope:+.3f} pts per rest-day differential")

# ---- 3. SURFACE (A27 scoring partial) ----
print("\n=== SURFACE (scoring only; injuries NOT_RUN) ===")
def surf_family(v):
    v = str(v).lower()
    if "turf" in v or "field" in v and "turf" in v or "artificial" in v:
        return "artificial"
    return "grass"
s["surf_fam"] = s.surface.map(surf_family)
surf_out = {}
for f in ["grass", "artificial"]:
    d = s[s.surf_fam == f]
    surf_out[f] = {"games": int(len(d)), "mean_total": round(float(d.total.mean()), 2),
                   "sd_total": round(float(d.total.std()), 2)}
    print(f, surf_out[f])
OUT["surface"] = surf_out

# ---- 4. PRIMETIME ----
print("\n=== PRIMETIME (Thu / Sun 8pm+ / Mon) vs Sun-day ===")
s["wd"] = s.weekday.astype(str)
def slot(row):
    if row.wd in ("Thursday", "Monday"):
        return "primetime"
    if row.wd == "Sunday":
        try:
            return "primetime" if int(str(row.gametime).split(":")[0]) >= 20 else "sun_day"
        except Exception:
            return None
    return "other"
s["slot"] = s.apply(slot, axis=1)
pt_out = {}
for sl in ["primetime", "sun_day"]:
    d = s[s.slot == sl]
    pt_out[sl] = {"games": int(len(d)), "mean_total": round(float(d.total.mean()), 2),
                  "sd_abs_margin": round(float(d.margin.abs().std()), 2)}
    print(sl, pt_out[sl])
OUT["primetime"] = pt_out

# ---- 5. DIVISION ----
print("\n=== DIVISION GAMES (folk wisdom: closer, lower scoring) ===")
div_out = {}
for name, d in [("division", s[s.div_game == True]), ("non-division", s[s.div_game != True])]:
    div_out[name] = {"games": int(len(d)), "mean_abs_margin": round(float(d.margin.abs().mean()), 2),
                     "mean_total": round(float(d.total.mean()), 2)}
    print(name, div_out[name])
OUT["division"] = div_out

# ---- 6. REFEREE CREWS + PENALTY PERSISTENCE (pbp join) ----
print("\n=== REFEREE CREWS: penalty yards per game (crews n>=30) ===")
pen_cols = ["game_id", "season_type", "penalty", "penalty_yards"]
pens = []
for y in range(2019, 2026):
    pb = pd.read_csv(f"{DATA}/pbp_{y}.csv.gz", compression="gzip", low_memory=False,
                     usecols=pen_cols)
    pens.append(pb[pb.season_type == "REG"])
pens_all = pd.concat(pens, ignore_index=True)
pens_all = pens_all[pens_all.penalty == 1]
game_pen = pens_all.groupby("game_id").penalty_yards.sum().rename("pen_yds").reset_index()
gp = game_pen.merge(s[["game_id", "referee"]], on="game_id", how="left")
crew = gp.dropna(subset=["referee"]).groupby("referee").agg(
    games=("pen_yds", "size"), mean_pen=("pen_yds", "mean")).reset_index()
crew_big = crew[crew.games >= 30].sort_values("mean_pen")
print(f"crews with n>=30: {len(crew_big)}")
if len(crew_big):
    print("lightest:", crew_big.head(3).round(1).to_dict("records"))
    print("heaviest:", crew_big.tail(3).round(1).to_dict("records"))
    spread = float(crew_big.mean_pen.max() - crew_big.mean_pen.min())
    print(f"crew spread (max-min mean pen-yds/game): {spread:.1f} "
          f"({'FLAG: thin-market totals angle' if spread > 15 else 'below 15-yd bar'})")
    OUT["referee"] = {"n_crews": int(len(crew_big)), "spread_yds": round(spread, 1),
                      "lightest": crew_big.head(2).to_dict("records"),
                      "heaviest": crew_big.tail(2).to_dict("records")}

print("\n=== PENALTY PERSISTENCE: team-game pen-yds W1-8 -> W9-18 ===")
team_pen = pens_all.groupby(["game_id", "penalty_team"]).penalty_yards.sum().rename("pen").reset_index()
tg_piv = []
for gid, d in team_pen.groupby("game_id"):
    a = d.iloc[0]
    tg_piv.append({"game_id": gid, "team": a.penalty_team, "pen": a.pen})
tg = pd.DataFrame(tg_piv)
tg = tg.merge(s[["game_id", "week"]], on="game_id")
trn = tg[tg.week <= 8].groupby("team").pen.sum()
tst = tg[tg.week >= 9].groupby("team").pen.sum()
common = trn.index.intersection(tst.index)
rho = float(spearmanr(trn.loc[common], tst.loc[common]).statistic)
print(f"n teams {len(common)}  Spearman {rho:.3f}  "
      f"({'factor CANDIDATE' if rho > 0.15 else 'DEAD (< 0.15)'})")
OUT["penalty_persistence"] = {"spearman": round(rho, 3), "n_teams": int(len(common))}

with open(f"{DATA}/new_areas_mills.json", "w") as fj:
    json.dump(OUT, fj, indent=2, default=str)
print("\nsaved data/new_areas_mills.json")
