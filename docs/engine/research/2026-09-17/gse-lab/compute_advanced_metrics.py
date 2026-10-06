"""
Galaxy Sports Edge — advanced metric depth pass (Worker A, 2026-09-17).

Extends compute_team_metrics.py (imported for load() + base_sample() so the
exact same filters apply: REG only, pass/run, no kneels/spikes, garbage-time
excluded, EPA from nflverse as-shipped). Everything here is computed from the
downloaded nflverse play-by-play CSVs; no external tables, no fabricated data.

Outputs (all in the same directory):
  metric_percentiles_2025.csv / _2026.csv   league percentile ranks (0-100, 100 = best)
  epa_distributions_2025.csv / _2026.csv    play-level EPA distribution per team
  weekly_trends_2025.csv                    team x week EPA/success trend, 2025 weeks 1-18
  unit_matchups_2025.csv / _2026.csv        pass/rush offense vs pass/rush defense EPA (+pct)
  drive_stats_2025.csv / _2026.csv          drive-level outcomes from nflverse drive columns
  down_splits_2025.csv / _2026.csv          early-down (1-2) vs late-down (3-4) splits
  extra_metrics_2025.csv / _2026.csv        stuff rate, air/yac components, late-and-close EPA
"""
import sys
import numpy as np
import pandas as pd

sys.path.insert(0, "/home/hatch/workspace/gse-research/nfl-2026")
from compute_team_metrics import load as load_pbp, base_sample, USECOLS

# extra columns needed by the depth pass (down splits, air/yac components)
EXTRA_COLS = ["down", "air_epa", "yac_epa", "air_yards"]


def load_ext(season):
    return pd.read_csv(f"/tmp/nflverse/pbp{season}.csv.gz", compression="gzip",
                       low_memory=False, usecols=list(dict.fromkeys(USECOLS + EXTRA_COLS)))

OUT_DIR = "/home/hatch/workspace/gse-research/nfl-2026"

DRIVE_COLS = ["game_id", "drive", "fixed_drive", "fixed_drive_result",
              "drive_play_count", "drive_start_yard_line", "posteam",
              "play_type", "play_id", "home_team", "away_team",
              "total_home_score", "total_away_score", "season_type"]


def percentile_100(s, higher_better=True):
    """League percentile 0-100 (100 = best team, 0 = worst), average ties, NaN kept."""
    n = int(s.notna().sum())
    if n < 2:
        return pd.Series(np.nan, index=s.index)
    r = s.rank(method="average", na_option="keep", ascending=higher_better)
    pct = (r - 1) / (n - 1) * 100.0
    if not higher_better:
        pct = (n - r) / (n - 1) * 100.0
    return pct


# ---- 1. percentiles for every metric in the existing team_metrics CSVs ----
LOWER_IS_BETTER = {
    "def_success_rate_allowed", "explosive_rate_allowed",
    "int_rate_per_dropback", "int_diff_actual_minus_expected",
    "fumble_lost_rate_per_play", "fumble_lost_diff_actual_minus_expected",
    "qb_hit_rate_allowed", "sack_rate_allowed",
    "int_worthy_throw_rate",
}
# identifier / volume / baseline-input columns: no percentile computed
EXCLUDE = {"team", "season", "n_games", "n_plays", "n_dropbacks", "n_rushes",
           "n_games_scored", "n_drives",
           "int_thrown", "fumbles", "fumbles_lost", "takeaways_int",
           "opp_fumbles", "opp_fumbles_lost", "opp_fumbles_lost_expected",
           "int_expected", "fumble_lost_expected", "takeaways_int_expected",
           "int_worthy_throws", "total_points"}


def compute_percentiles(season):
    m = pd.read_csv(f"{OUT_DIR}/team_metrics_{season}.csv")
    cols = [c for c in m.columns if c not in EXCLUDE]
    out = m[["team", "season"]].copy()
    for c in cols:
        out[c + "_pct"] = percentile_100(m[c], higher_better=(c not in LOWER_IS_BETTER))
    return out


# ---- 2. play-level EPA distributions per team ----
def epa_dist(epa_series):
    e = epa_series.dropna()
    n = len(e)
    if n == 0:
        return dict(n=0, mean=np.nan, p10=np.nan, p25=np.nan, median=np.nan,
                    p75=np.nan, p90=np.nan, share_neg_epa=np.nan, share_chunk_epa=np.nan)
    return dict(n=n, mean=e.mean(),
                p10=e.quantile(0.10), p25=e.quantile(0.25), median=e.median(),
                p75=e.quantile(0.75), p90=e.quantile(0.90),
                share_neg_epa=(e < 0).mean(), share_chunk_epa=(e > 1.0).mean())


def compute_distributions(season):
    d = base_sample(load_pbp(season))
    rows = []
    for t in sorted(d["posteam"].dropna().unique()):
        o = d[d["posteam"] == t]
        x = d[d["defteam"] == t]
        # defense: sign-flipped opponent EPA so positive = good defense
        for side, frame, epa in (("offense", o, o["epa"]), ("defense", x, -x["epa"])):
            for split, sub in (("all", frame),
                               ("dropback", frame[frame["is_dropback"] == 1]),
                               ("rush", frame[frame["is_rush"] == 1])):
                sub_epa = epa.loc[sub.index]
                r = dict(team=t, season=season, side=side, split=split)
                r.update(epa_dist(sub_epa))
                rows.append(r)
    return pd.DataFrame(rows)


# ---- 3. weekly EPA/play trend, 2025 ----
def compute_weekly_trends():
    d = base_sample(load_pbp(2025))
    rows = []
    for t in sorted(d["posteam"].dropna().unique()):
        for w in sorted(d["week"].dropna().unique()):
            o = d[(d["posteam"] == t) & (d["week"] == w)]
            x = d[(d["defteam"] == t) & (d["week"] == w)]
            if len(o) == 0:
                continue
            db = o[o["is_dropback"] == 1]
            ru = o[o["is_rush"] == 1]
            rows.append(dict(
                team=t, week=int(w), season=2025,
                n_games=int(o["game_id"].nunique()),
                n_plays=len(o), n_dropbacks=len(db), n_rushes=len(ru),
                epa_per_play=o["epa"].mean(),
                epa_per_dropback=db["epa"].mean() if len(db) else np.nan,
                epa_per_rush=ru["epa"].mean() if len(ru) else np.nan,
                success_rate=o["success"].mean(),
                def_epa_per_play=-x["epa"].mean() if len(x) else np.nan,
                def_epa_per_dropback=-x.loc[x["is_dropback"] == 1, "epa"].mean(),
                def_epa_per_rush=-x.loc[x["is_rush"] == 1, "epa"].mean(),
                def_success_rate_allowed=x["success"].mean() if len(x) else np.nan,
            ))
    return pd.DataFrame(rows).sort_values(["team", "week"]).reset_index(drop=True)


# ---- 4. unit-on-unit matchup table ----
def compute_unit_matchups(season):
    d = base_sample(load_pbp(season))
    m = pd.read_csv(f"{OUT_DIR}/team_metrics_{season}.csv")
    iw = m.set_index("team")["int_worthy_throw_rate"] if "int_worthy_throw_rate" in m.columns else None
    rows = []
    for t in sorted(d["posteam"].dropna().unique()):
        o = d[d["posteam"] == t]
        x = d[d["defteam"] == t]
        odb, oru = o[o["is_dropback"] == 1], o[o["is_rush"] == 1]
        xdb, xru = x[x["is_dropback"] == 1], x[x["is_rush"] == 1]
        rows.append(dict(
            team=t, season=season,
            pass_off_epa=odb["epa"].mean(), pass_off_success=odb["success"].mean(),
            rush_off_epa=oru["epa"].mean(), rush_off_success=oru["success"].mean(),
            pass_def_epa=-xdb["epa"].mean(), pass_def_success_allowed=xdb["success"].mean(),
            rush_def_epa=-xru["epa"].mean(), rush_def_success_allowed=xru["success"].mean(),
            stuff_rate=(oru["yards_gained"] <= 0).mean() if len(oru) else np.nan,
            stuff_rate_allowed=(xru["yards_gained"] <= 0).mean() if len(xru) else np.nan,
            int_worthy_throw_rate=(iw.loc[t] if iw is not None else np.nan),
            n_plays=len(o),
        ))
    out = pd.DataFrame(rows)
    for c in ["pass_off_epa", "rush_off_epa", "pass_off_success", "rush_off_success",
              "pass_def_epa", "rush_def_epa"]:
        out[c + "_pct"] = percentile_100(out[c], higher_better=True)
    for c in ["pass_def_success_allowed", "rush_def_success_allowed",
              "stuff_rate", "stuff_rate_allowed", "int_worthy_throw_rate"]:
        out[c + "_pct"] = percentile_100(out[c], higher_better=False)
    return out


# ---- 5. drive-level stats ----
def drive_team_frame(g):
    """Drive identification: (game_id, fixed_drive); offensive team = majority
    posteam over scrimmage plays (pass/run/punt/field_goal); result = last play's
    fixed_drive_result; points = that team's score diff across the drive."""
    scr = g[g["play_type"].isin(["pass", "run", "punt", "field_goal"])]
    if len(scr) == 0:
        return None
    team = scr["posteam"].mode().iloc[0]
    g = g.sort_values("play_id")
    first, last = g.iloc[0], g.iloc[-1]
    if team == first["home_team"]:
        pts = last["total_home_score"] - first["total_home_score"]
    else:
        pts = last["total_away_score"] - first["total_away_score"]
    # drive start field position in yards from the offense's own goal line
    start = first["drive_start_yard_line"]
    start_own = np.nan
    try:
        who, yd = str(start).split()
        yd = float(yd)
        start_own = yd if who == team else 100.0 - yd
    except Exception:
        pass
    return dict(team=team, result=last["fixed_drive_result"],
                play_count=last["drive_play_count"], points=pts, start_own=start_own)


def compute_drive_stats(season):
    df = pd.read_csv(f"/tmp/nflverse/pbp{season}.csv.gz", compression="gzip",
                     low_memory=False, usecols=DRIVE_COLS)
    g = df[(df["season_type"] == "REG") & (df["drive"] != 0)]
    recs = []
    for _, grp in g.groupby(["game_id", "fixed_drive"], sort=False):
        r = drive_team_frame(grp)
        if r is not None:
            recs.append(r)
    dd = pd.DataFrame(recs)
    dd["is_td"] = (dd["result"] == "Touchdown").astype(int)
    dd["is_fg"] = (dd["result"] == "Field goal").astype(int)
    dd["is_punt"] = (dd["result"] == "Punt").astype(int)
    dd["is_3out"] = ((dd["play_count"] == 3) & (dd["result"] == "Punt")).astype(int)
    # turnover drives: giveaways the defense ended up with (INT/fumble; incl. returned for TD)
    dd["is_turnover"] = dd["result"].isin(["Turnover", "Opp touchdown"]).astype(int)
    dd["is_downs"] = (dd["result"] == "Turnover on downs").astype(int)
    agg = (dd.groupby("team")
             .agg(n_drives=("points", "size"),
                  points_per_drive=("points", "mean"),
                  td_rate=("is_td", "mean"), fg_rate=("is_fg", "mean"),
                  punt_rate=("is_punt", "mean"),
                  three_and_out_rate=("is_3out", "mean"),
                  turnover_drive_rate=("is_turnover", "mean"),
                  downs_rate=("is_downs", "mean"),
                  avg_drive_start_own=("start_own", "mean"))
             .reset_index())
    agg["season"] = season
    return agg


# ---- 6. early-down vs late-down splits ----
def compute_down_splits(season):
    d = base_sample(load_ext(season))
    d = d[d["down"].isin([1, 2, 3, 4])]
    rows = []
    for t in sorted(d["posteam"].dropna().unique()):
        o = d[d["posteam"] == t]
        x = d[d["defteam"] == t]
        for side, frame, epa in (("offense", o, o["epa"]), ("defense", x, -x["epa"])):
            for grp, label in (([1, 2], "early_1_2"), ([3, 4], "late_3_4")):
                sub = frame[frame["down"].isin(grp)]
                sub_epa = epa.loc[sub.index]
                rows.append(dict(team=t, season=season, side=side, down_group=label,
                                 n_plays=len(sub),
                                 epa_per_play=sub_epa.mean() if len(sub) else np.nan,
                                 success_rate=sub["success"].mean() if len(sub) else np.nan))
    return pd.DataFrame(rows)


# ---- 7/8. stuff rate, air/yac components, late-and-close ----
def compute_extra(season):
    d = base_sample(load_ext(season))
    rows = []
    for t in sorted(d["posteam"].dropna().unique()):
        o = d[d["posteam"] == t]
        x = d[d["defteam"] == t]
        odb, oru = o[o["is_dropback"] == 1], o[o["is_rush"] == 1]
        xdb = x[x["is_dropback"] == 1]
        lc = o[(o["qtr"] == 4) & (o["wp"] >= 0.20) & (o["wp"] <= 0.80)]
        lcx = x[(x["qtr"] == 4) & (x["wp"] >= 0.20) & (x["wp"] <= 0.80)]
        rows.append(dict(
            team=t, season=season,
            # stuff rate: designed rushes for <= 0 yards (no gain or TFL)
            stuff_rate=(oru["yards_gained"] <= 0).mean() if len(oru) else np.nan,
            stuff_rate_allowed=(x[x["is_rush"] == 1]["yards_gained"] <= 0).mean()
            if (x["is_rush"] == 1).sum() else np.nan,
            # passing components per dropback (air vs YAC)
            air_epa_per_dropback=odb["air_epa"].mean() if len(odb) else np.nan,
            yac_epa_per_dropback=odb["yac_epa"].mean() if len(odb) else np.nan,
            air_yards_per_dropback=odb["air_yards"].mean() if len(odb) else np.nan,
            def_air_epa_allowed=-xdb["air_epa"].mean() if len(xdb) else np.nan,
            def_yac_epa_allowed=-xdb["yac_epa"].mean() if len(xdb) else np.nan,
            def_air_yards_allowed=xdb["air_yards"].mean() if len(xdb) else np.nan,
            # late-and-close: 4th quarter, possession-team wp in [0.20, 0.80]
            n_late_close=len(lc),
            late_close_epa=lc["epa"].mean() if len(lc) else np.nan,
            late_close_success=lc["success"].mean() if len(lc) else np.nan,
            late_close_def_epa=-lcx["epa"].mean() if len(lcx) else np.nan,
        ))
    return pd.DataFrame(rows)


if __name__ == "__main__":
    F = "%.5f"
    print("percentiles...", flush=True)
    compute_percentiles(2025).to_csv(f"{OUT_DIR}/metric_percentiles_2025.csv", index=False, float_format=F)
    compute_percentiles(2026).to_csv(f"{OUT_DIR}/metric_percentiles_2026.csv", index=False, float_format=F)
    print("distributions...", flush=True)
    compute_distributions(2025).to_csv(f"{OUT_DIR}/epa_distributions_2025.csv", index=False, float_format=F)
    compute_distributions(2026).to_csv(f"{OUT_DIR}/epa_distributions_2026.csv", index=False, float_format=F)
    print("weekly...", flush=True)
    compute_weekly_trends().to_csv(f"{OUT_DIR}/weekly_trends_2025.csv", index=False, float_format=F)
    print("matchups...", flush=True)
    compute_unit_matchups(2025).to_csv(f"{OUT_DIR}/unit_matchups_2025.csv", index=False, float_format=F)
    compute_unit_matchups(2026).to_csv(f"{OUT_DIR}/unit_matchups_2026.csv", index=False, float_format=F)
    print("drives...", flush=True)
    compute_drive_stats(2025).to_csv(f"{OUT_DIR}/drive_stats_2025.csv", index=False, float_format=F)
    compute_drive_stats(2026).to_csv(f"{OUT_DIR}/drive_stats_2026.csv", index=False, float_format=F)
    print("downs...", flush=True)
    compute_down_splits(2025).to_csv(f"{OUT_DIR}/down_splits_2025.csv", index=False, float_format=F)
    compute_down_splits(2026).to_csv(f"{OUT_DIR}/down_splits_2026.csv", index=False, float_format=F)
    print("extra...", flush=True)
    compute_extra(2025).to_csv(f"{OUT_DIR}/extra_metrics_2025.csv", index=False, float_format=F)
    compute_extra(2026).to_csv(f"{OUT_DIR}/extra_metrics_2026.csv", index=False, float_format=F)
    print("done")
