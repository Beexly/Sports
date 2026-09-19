"""League recovery baseline + MoM-K mill for the turnover-luck evaluator.

PRE-REGISTRATIONS (stated before evaluation):
1. League recovery baseline: re-measure kept/fumbles across 2019-2025 REG. Use the
   multi-season pooled value as RECOVERY_BASELINE unless it is within 0.01 of the
   locked 46.3%, in which case keep 46.3% (locked takes precedence).
2. K mill: fixed K_FF=200 vs method-of-moments K (fit on 2019-2023 team-season
   recovery-share dispersion). MoM wins only if it improves the persistence test
   (occurrence Spearman W1-8 -> W9-18) on a MAJORITY of 2023/2024/2025 seasons
   AND lifts the mean. Production K stays named (200) unless both conditions hold.
3. Occurrence-model kill (per seat directive): occurrence Spearman >= 0.30, n=32,
   else the evaluator stays Rung-1 descriptive and does NOT graduate to a
   predictive factor.
"""
import numpy as np
import pandas as pd
from scipy.stats import spearmanr

DATA = "data"
YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025]
K_FF = 200.0
K_INT = 150.0


def load(year):
    pbp = pd.read_csv(f"{DATA}/pbp_{year}.csv.gz", compression="gzip", low_memory=False,
                      usecols=["game_id", "week", "season_type", "posteam", "play_type",
                               "interception", "fumble", "fumble_lost", "qb_dropback"])
    pbp = pbp[(pbp.season_type == "REG") & pbp.posteam.notna()]
    for c in ["interception", "fumble", "fumble_lost"]:
        pbp[c] = pbp[c].fillna(0).astype(int)
    pbp["qb_dropback"] = pbp["qb_dropback"].fillna(0).astype(int)
    return pbp


def team_season(pb, weeks=None):
    p = pb if weeks is None else pb[pb.week.isin(weeks)]
    g = p.groupby("posteam").agg(fumbles=("fumble", "sum"), flost=("fumble_lost", "sum"),
                                 ints=("interception", "sum"), plays=("play_type", "size"),
                                 dropbacks=("qb_dropback", "sum"))
    g["kept"] = g.fumbles - g.flost
    return g


# ---- 1. league recovery baseline across all seasons on disk ----------------
print("=== league recovery share (kept/fumbles), REG ===")
base_rows = []
for y in YEARS:
    try:
        g = team_season(load(y))
    except FileNotFoundError:
        print(f"{y}: NOT_RUN (file not on disk)")
        continue
    tot_f, tot_k = int(g.fumbles.sum()), int(g.kept.sum())
    base_rows.append((y, tot_f, tot_k, tot_k / tot_f))
    print(f"{y}: fumbles {tot_f:5d}  kept {tot_k:5d}  share {tot_k/tot_f:.4f}")
dfb = pd.DataFrame(base_rows, columns=["season", "fumbles", "kept", "share"])
pooled = dfb.kept.sum() / dfb.fumbles.sum()
print(f"POOLED 2019-2025 recovery share: {pooled:.4f} (locked: 0.463)")
BASELINE = 0.463 if abs(pooled - 0.463) < 0.01 else round(pooled, 4)
print(f"ADOPTED BASELINE: {BASELINE}")

# ---- 2. MoM-K for recovery share from 2019-2023 dispersion -----------------
print("\n=== MoM-K for recovery (train seasons 2019-2023, n>=3 fumbles) ===")
shares = []
for y in [2019, 2020, 2021, 2022, 2023]:
    try:
        g = team_season(load(y))
    except FileNotFoundError:
        continue
    g = g[g.fumbles >= 3]
    shares.extend((g.kept / g.fumbles).tolist())
sh = np.array(shares)
p0 = BASELINE
# beta-binomial MoM: Var(p_hat) = p0(1-p0)*(1 + (n-1)/(K+n))... per-observation with
# unequal n -> use the standard moment equation on the pooled level with mean n:
n_bar = 3.0  # conservative floor choice documented: shares at n=3 are noisiest
# simpler honest approach: simulate-free moment using overall dispersion vs binomial
# Var_obs = p0(1-p0)/n + tau2, tau2 = p0(1-p0)/(K) approximately for beta prior.
var_obs = float(np.var(sh, ddof=1))
tau2 = max(var_obs - p0 * (1 - p0) / n_bar, 1e-6)
K_mom = p0 * (1 - p0) / tau2
print(f"teams pooled: {len(sh)}, mean share {sh.mean():.4f}, var {var_obs:.5f}, "
      f"tau2 {tau2:.5f} -> K_mom ~ {K_mom:.1f}")

# ---- 3. persistence test: occurrence model, fixed K vs MoM K, 2023-2025 ----
print("\n=== occurrence persistence W1-8 -> W9-18 (kill: Spearman >= 0.30, n=32) ===")

def team_game_to(year):
    pbp = load(year)
    g = pbp.groupby(["game_id", "week", "posteam"]).agg(
        plays=("play_type", "size"), dropbacks=("qb_dropback", "sum"),
        ints=("interception", "sum"), fumbles=("fumble", "sum"),
        flost=("fumble_lost", "sum")).reset_index()
    rows = []
    for _, d in g.groupby("game_id"):
        if len(d) != 2:
            continue
        a, b = d.iloc[0], d.iloc[1]
        for me, other in ((a, b), (b, a)):
            rows.append({
                "game_id": me.game_id, "week": me.week, "team": me.posteam,
                "opponent": other.posteam, "plays": me.plays, "dropbacks": me.dropbacks,
                "ints_thrown": me.ints, "fumbles_lost": me.flost,
                "giveaways": me.ints + me.flost,
                "ints_forced": other.ints, "ff_forced": other.fumbles,
                "opp_flost": other.flost, "opp_plays": other.plays,
                "opp_dropbacks": other.dropbacks,
                "takeaways": me.ints + other.flost,  # INTs + opponent fumbles lost
            })
    return pd.DataFrame(rows)


def persistence(year, K_INT_use, K_FF_use, baseline_use):
    """Clean: occurrence rates from TRAIN only; volumes = league-average TEST;
    actual takeaways = INTs forced + opponent fumbles LOST (full credit).
    Pre-registered kill: occurrence-model Spearman >= 0.30, n=32."""
    tg = team_game_to(year)
    trn, tst = tg[tg.week <= 8], tg[tg.week >= 9]
    lg_int = trn.ints_forced.sum() / max(trn.opp_dropbacks.sum(), 1)
    lg_ff = trn.ff_forced.sum() / max(trn.opp_plays.sum(), 1)
    vol_db = tst.groupby("team").opp_dropbacks.mean().mean()
    vol_pl = tst.groupby("team").opp_plays.mean().mean()
    lg_exp = lg_int * vol_db + lg_ff * (1 - baseline_use) * vol_pl
    e = trn.groupby("team").agg(ints=("ints_forced", "sum"), ff=("ff_forced", "sum"),
                                db=("opp_dropbacks", "sum"), pl=("opp_plays", "sum"))
    int_rate = (e.ints + K_INT_use * lg_int) / (e.db + K_INT_use)
    ff_rate = (e.ff + K_FF_use * lg_ff) / (e.pl + K_FF_use)
    exp_to_diff = int_rate * vol_db + ff_rate * (1 - baseline_use) * vol_pl - lg_exp
    act = tst.groupby("team").takeaways.sum()
    naive = trn.groupby("team").takeaways.sum()
    common = exp_to_diff.index.intersection(act.index)
    rho = float(spearmanr(exp_to_diff.loc[common], act.loc[common]).statistic)
    rmse = float(np.sqrt(np.mean((exp_to_diff.loc[common] - act.loc[common]) ** 2)))
    rho_n = float(spearmanr(naive.loc[common], act.loc[common]).statistic)
    return rho, rho_n, rmse


print("season | fixed K(200/150) rho | MoM K rho | naive rho | n")
occ_results = []
for y in [2023, 2024, 2025]:
    r_fix, r_naive, rmse = persistence(y, K_INT, K_FF, BASELINE)
    r_mom, _, _ = persistence(y, K_INT, max(K_mom, 2.0), BASELINE)
    occ_results.append((y, r_fix, r_mom, r_naive))
    print(f"{y} | {r_fix:.3f} | {r_mom:.3f} | {r_naive:.3f} | 32")
mean_fix = np.mean([r[1] for r in occ_results])
mean_naive = np.mean([r[3] for r in occ_results])
print(f"mean occurrence rho (fixed K): {mean_fix:.3f} | mean naive rho: {mean_naive:.3f}")
print(f"kill line (occurrence >= 0.30): {'PASS' if mean_fix >= 0.30 else 'FAIL'}")
