"""
Galaxy Sports Edge — kicker, defensive-detail, special-teams, and
turnover luck-layer metrics from nflverse play-by-play.

Extends compute_team_metrics.py / compute_advanced_metrics.py. Imports
load()/base_sample() from compute_team_metrics so the efficiency-sample
filters are identical (REG only, pass/run, no kneels/spikes, garbage-time
excluded, success = EPA > 0). Drive-based rates use the UNFILTERED REG
sample with the drive_team_frame convention from compute_advanced_metrics
(kickoffs group with the receiving team's drive; on a kickoff play
posteam = the RETURN team and defteam = the KICKING team — verified
empirically on 2025_01_ARI_NO).

Data notes (verified on the 2025 file, documented in COMPUTATION_NOTES.md):
- nflverse pbp has NO tackle_for_loss column and NO return_epa column.
  TFL rate is computed as opponent designed rushes with yards_gained < 0
  (a negative-yardage designed run is a tackle for loss by definition).
  Return EPA per return is computed from the play-level epa on the
  kick/punt play (EPA bundles the kick/punt WITH its return — documented).
- FG results: 'made'/'missed'/'blocked'. XP results: 'good'/'failed'/'blocked'.
- Onside kicks cannot be identified (no column). Kickoffs where the kicking
  team kept possession (onside recovered or return fumble, 93/2785 in 2025)
  are excluded from opp_avg_start_after_kickoff; the exclusion count is
  reported per team in special_teams CSVs.
- 2025 touchback spot = 35-yard line (confirmed in drive_start_yard_line).

Outputs: kicker_metrics_{2025,2026}.csv, defense_detail_{2025,2026}.csv,
         special_teams_{2025,2026}.csv, turnover_luck_{2025,2026}.csv
"""
import numpy as np
import pandas as pd

from compute_team_metrics import load, base_sample
from compute_advanced_metrics import drive_team_frame, percentile_100

OUT_DIR = "/home/hatch/workspace/gse-research/nfl-2026"

KICK_COLS = ["game_id", "season_type", "play_type", "posteam", "defteam",
             "field_goal_attempt", "field_goal_result", "kick_distance",
             "kicker_player_name", "extra_point_attempt", "extra_point_result",
             "epa", "home_team", "away_team", "total_home_score",
             "total_away_score"]
ST_COLS = KICK_COLS + ["play_id", "kickoff_attempt", "punt_attempt",
                       "touchback", "return_yards", "punt_fair_catch",
                       "punt_out_of_bounds", "punt_downed",
                       "punt_inside_twenty", "blocked_player_name",
                       "drive_start_yard_line", "fixed_drive", "drive",
                       "yardline_100", "return_team"]
DRIVE_COLS = ["game_id", "season_type", "drive", "fixed_drive", "fixed_drive_result",
              "drive_play_count", "drive_start_yard_line", "posteam",
              "play_type", "home_team", "away_team", "total_home_score",
              "total_away_score", "play_id", "defteam", "interception",
              "fumble", "fumble_lost", "return_touchdown"]


def fg_bucket(dist):
    if dist < 30:
        return "u30"
    if dist < 40:
        return "b30_39"
    if dist < 50:
        return "b40_49"
    return "b50p"


# ---------------------------------------------------------------- kicker ---
def compute_kicker(season):
    df = pd.read_csv(f"/tmp/nflverse/pbp{season}.csv.gz", compression="gzip",
                     low_memory=False, usecols=KICK_COLS)
    d = df[df["season_type"] == "REG"].copy()
    # NOTE: full-game kicking record — no garbage-time filter (documented).
    fg = d[d["field_goal_attempt"] == 1].copy()
    fg["made"] = (fg["field_goal_result"] == "made").astype(int)
    fg["bucket"] = fg["kick_distance"].apply(fg_bucket)
    xp = d[d["extra_point_attempt"] == 1].copy()
    xp["made"] = (xp["extra_point_result"] == "good").astype(int)

    games = (d.groupby("game_id")
               .agg(home_team=("home_team", "first"),
                    away_team=("away_team", "first")).reset_index())
    team_games = (pd.concat([games[["home_team"]].rename(columns={"home_team": "team"}),
                             games[["away_team"]].rename(columns={"away_team": "team"})])
                    .groupby("team").size().rename("n_games"))

    rows = []
    for t in sorted(d["posteam"].dropna().unique()):
        f = fg[fg["posteam"] == t]
        x = xp[xp["posteam"] == t]
        row = {"team": t, "season": season,
               "n_games": int(team_games.get(t, 0)),
               "kickers": ";".join(sorted(f["kicker_player_name"].dropna().unique())),
               "fg_att_total": len(f), "fg_made_total": int(f["made"].sum()),
               "fg_make_rate": f["made"].mean() if len(f) else np.nan,
               "fg_epa_per_attempt": f["epa"].mean() if len(f) else np.nan,
               "xp_att": len(x), "xp_made": int(x["made"].sum()),
               "xp_make_rate": x["made"].mean() if len(x) else np.nan,
               "xp_epa_per_attempt": x["epa"].mean() if len(x) else np.nan}
        ng = row["n_games"] or 1
        for b in ["u30", "b30_39", "b40_49", "b50p"]:
            fb = f[f["bucket"] == b]
            row[f"fg_att_{b}"] = len(fb)
            row[f"fg_made_{b}"] = int(fb["made"].sum())
            row[f"fg_make_rate_{b}"] = fb["made"].mean() if len(fb) else np.nan
            row[f"fg_att_{b}_per_game"] = len(fb) / ng
        row["kicking_points_per_game"] = (3 * row["fg_made_total"] + row["xp_made"]) / ng
        rows.append(row)
    out = pd.DataFrame(rows)
    for c in ["fg_make_rate", "xp_make_rate", "kicking_points_per_game",
              "fg_epa_per_attempt", "xp_epa_per_attempt"]:
        out[c + "_pct"] = percentile_100(out[c], higher_better=True)
    return out


# ------------------------------------------------------- defensive detail ---
def _drive_frame(season):
    """Unfiltered REG drive frame with (game_id, fixed_drive) keys."""
    ddf = pd.read_csv(f"/tmp/nflverse/pbp{season}.csv.gz", compression="gzip",
                      low_memory=False, usecols=DRIVE_COLS)
    g = ddf[(ddf["season_type"] == "REG") & (ddf["drive"] != 0)]
    recs = []
    for (gid, fd), grp in g.groupby(["game_id", "fixed_drive"], sort=False):
        r = drive_team_frame(grp)
        if r is not None:
            recs.append({"game_id": gid, "fixed_drive": fd, **r})
    dd = pd.DataFrame(recs)
    # play -> fixed_drive lookup
    pmap = (g[["game_id", "play_id", "fixed_drive"]]
            .drop_duplicates().set_index(["game_id", "play_id"])["fixed_drive"])
    fin = (ddf[ddf["season_type"] == "REG"].groupby("game_id")
             .agg(home_team=("home_team", "first"), away_team=("away_team", "first"),
                  hs=("total_home_score", "max"),
                  aws=("total_away_score", "max")).reset_index())
    return dd, pmap, fin


def compute_defense_detail(season):
    d = base_sample(load(season))          # filtered sample (offense-side)
    d["is_dropback"] = ((d["pass_attempt"] == 1) | (d["qb_scramble"] == 1)).astype(int)
    d["is_rush"] = ((d["rush_attempt"] == 1) & (d["qb_scramble"] == 0)
                    & (d["qb_kneel"] == 0)).astype(int)
    dd, pmap, fin = _drive_frame(season)

    # takeaway / defensive-TD plays attributed to the defense (defteam)
    pl = pd.read_csv(f"/tmp/nflverse/pbp{season}.csv.gz", compression="gzip",
                     low_memory=False,
                     usecols=["game_id", "play_id", "season_type", "play_type",
                              "defteam", "posteam", "interception", "fumble",
                              "fumble_lost", "return_touchdown"])
    pl = pl[(pl["season_type"] == "REG") & (pl["play_type"].isin(["pass", "run"]))]
    pl["is_takeaway"] = ((pl["interception"] == 1) |
                         ((pl["fumble"] == 1) & (pl["fumble_lost"] == 1))).astype(int)
    # defensive TD = return TD on an opponent scrimmage play (verified: 46 in 2025,
    # all on INT/fumble-return plays)
    pl["is_def_td"] = ((pl["return_touchdown"] == 1)).astype(int)

    def drive_keys(df_take):
        keys = set()
        for _, r_ in df_take.iterrows():
            try:
                keys.add((r_["game_id"], pmap.loc[(r_["game_id"], r_["play_id"])]))
            except KeyError:
                pass
        return keys

    pa = (pd.concat([fin[["home_team", "aws"]]
                    .rename(columns={"home_team": "team", "aws": "pa"}),
                     fin[["away_team", "hs"]]
                    .rename(columns={"away_team": "team", "hs": "pa"})])
            .groupby("team")["pa"].sum())

    rows = []
    for t in sorted(d["posteam"].dropna().unique()):
        x = d[d["defteam"] == t]           # filtered opponent plays
        xdb = x[x["is_dropback"] == 1]
        xr = x[x["is_rush"] == 1]
        ints_f = int(x["interception"].sum())
        ff = int(x["fumble"].sum())              # forced fumbles (occurrence)
        ff_lost = int(x["fumble_lost"].sum())    # recovered by this defense
        tfl = int((xr["yards_gained"] < 0).sum())

        game_ids = set(fin[(fin["home_team"] == t) |
                           (fin["away_team"] == t)]["game_id"])
        opp_drives = dd[dd["game_id"].isin(game_ids) & (dd["team"] != t)]
        n_opp = len(opp_drives)
        tp = pl[(pl["defteam"] == t) & (pl["is_takeaway"] == 1)]
        dp = pl[(pl["defteam"] == t) & (pl["is_def_td"] == 1)]
        tk_keys = drive_keys(tp)
        td_keys = drive_keys(dp)
        n_tk_drives = sum(1 for _, r_ in opp_drives.iterrows()
                          if (r_["game_id"], r_["fixed_drive"]) in tk_keys)
        n_td_drives = sum(1 for _, r_ in opp_drives.iterrows()
                          if (r_["game_id"], r_["fixed_drive"]) in td_keys)
        n_def_tds = len(dp)

        rows.append({
            "team": t, "season": season,
            "n_plays_def": len(x), "n_dropbacks_def": len(xdb),
            "n_rushes_def": len(xr), "n_def_drives": n_opp,
            "int_forced": ints_f,
            "int_forced_rate_per_dropback":
                ints_f / len(xdb) if len(xdb) else np.nan,
            "forced_fumbles": ff,
            "forced_fumble_rate_per_play": ff / len(x) if len(x) else np.nan,
            "opp_fumble_recovery_share": ff_lost / ff if ff else np.nan,
            "tfl": tfl,
            "tfl_rate_per_rush": tfl / len(xr) if len(xr) else np.nan,
            "takeaways": len(tp),
            "takeaway_rate_per_drive": n_tk_drives / n_opp if n_opp else np.nan,
            "defensive_tds": n_def_tds,
            "defensive_td_rate_per_drive": n_td_drives / n_opp if n_opp else np.nan,
            "points_allowed_per_drive":
                pa.get(t, np.nan) / n_opp if n_opp else np.nan,
        })
    out = pd.DataFrame(rows)
    for c in ["int_forced_rate_per_dropback", "forced_fumble_rate_per_play",
              "opp_fumble_recovery_share", "tfl_rate_per_rush",
              "takeaway_rate_per_drive", "defensive_td_rate_per_drive"]:
        out[c + "_pct"] = percentile_100(out[c], higher_better=True)
    out["points_allowed_per_drive_pct"] = percentile_100(
        out["points_allowed_per_drive"], higher_better=False)
    return out


# ---------------------------------------------------------- special teams ---
def compute_special_teams(season):
    df = pd.read_csv(f"/tmp/nflverse/pbp{season}.csv.gz", compression="gzip",
                     low_memory=False, usecols=ST_COLS)
    d = df[df["season_type"] == "REG"].copy()
    # NOTE: full-game special-teams record — no garbage-time filter (documented).
    ko = d[d["kickoff_attempt"] == 1].copy()
    pu = d[d["punt_attempt"] == 1].copy()
    fg = d[d["field_goal_attempt"] == 1].copy()

    def parse_start(s):
        try:
            who, yd = str(s).split()
            return who, float(yd)
        except Exception:
            return None, np.nan

    ko[["start_team", "start_yd"]] = ko["drive_start_yard_line"].apply(
        lambda s: pd.Series(parse_start(s)))
    # kickoffs where the kicking team (defteam) kept the ball: onside recovered
    # or return fumble — excluded from opp start (counted in n_ko_excluded)
    ko["kicking_kept"] = (ko["start_team"] == ko["defteam"])
    # punt return = opponent punt actually returned
    pu["is_return"] = ((pu["touchback"] == 0) & (pu["punt_fair_catch"] == 0) &
                       (pu["punt_out_of_bounds"] == 0) & (pu["punt_downed"] == 0))

    rows = []
    for t in sorted(d["posteam"].dropna().unique()):
        kicked = ko[ko["defteam"] == t]        # T kicked off
        received_ko = ko[ko["posteam"] == t]   # T received kickoffs
        punts = pu[pu["posteam"] == t]         # T punted
        punt_ret = pu[(pu["defteam"] == t) & (pu["is_return"] == 1)]  # T returned
        opp_fg = fg[fg["defteam"] == t]
        opp_pu = pu[pu["defteam"] == t]

        ks = kicked[~kicked["kicking_kept"]]   # normal kickoffs for start calc
        tb = int(kicked["touchback"].sum())
        rko = received_ko[received_ko["touchback"] == 0]  # actual kick returns

        rows.append({
            "team": t, "season": season,
            # kickoff coverage unit (T kicking)
            "n_kickoffs": len(kicked),
            "touchbacks_forced": tb,
            "touchback_rate": tb / len(kicked) if len(kicked) else np.nan,
            "opp_avg_start_after_kickoff":
                ks["start_yd"].mean() if len(ks) else np.nan,
            "n_ko_excluded_onside_kept": int(kicked["kicking_kept"].sum()),
            # epa on kickoff plays is from the return team's (posteam) perspective
            "kickoff_epa_per_kick": -kicked["epa"].mean() if len(kicked) else np.nan,
            # kick return unit (T receiving)
            "n_kickoffs_received": len(received_ko),
            "n_kick_returns": len(rko),
            "kick_return_epa_per_return":
                rko["epa"].mean() if len(rko) else np.nan,
            "kick_return_yards_per_return":
                rko["return_yards"].mean() if len(rko) else np.nan,
            # punt unit (T punting; epa from punter's perspective)
            "n_punts": len(punts),
            "punt_epa_per_punt": punts["epa"].mean() if len(punts) else np.nan,
            "punt_touchback_rate":
                punts["touchback"].mean() if len(punts) else np.nan,
            "punt_inside_20_rate":
                punts["punt_inside_twenty"].mean() if len(punts) else np.nan,
            # punt return unit (T receiving)
            "n_punt_returns": len(punt_ret),
            "punt_return_epa_per_return":
                -punt_ret["epa"].mean() if len(punt_ret) else np.nan,
            "punt_return_yards_per_return":
                punt_ret["return_yards"].mean() if len(punt_ret) else np.nan,
            # blocks (rare — counts per task)
            "fg_blocks_forced":
                int(((opp_fg["field_goal_result"] == "blocked")).sum()),
            "opp_fg_attempts": len(opp_fg),
            "punt_blocks_forced":
                int(opp_pu["blocked_player_name"].notna().sum()),
            "opp_punts": len(opp_pu),
            "xp_blocks_forced":
                int((d[(d["defteam"] == t) &
                       (d["extra_point_attempt"] == 1) &
                       (d["extra_point_result"] == "blocked")]).shape[0]),
        })
    out = pd.DataFrame(rows)
    for c in ["touchback_rate", "kickoff_epa_per_kick",
              "kick_return_epa_per_return", "punt_epa_per_punt",
              "punt_inside_20_rate", "punt_return_epa_per_return"]:
        out[c + "_pct"] = percentile_100(out[c], higher_better=True)
    for c in ["opp_avg_start_after_kickoff", "punt_touchback_rate"]:
        out[c + "_pct"] = percentile_100(out[c], higher_better=False)
    return out


# ------------------------------------------------------- turnover luck layer -
def compute_turnover_luck(season):
    """Occurrence vs recovery decomposition (the luck layer).
    Literature: forced-fumble occurrence shows weak repeatability (partially
    skill); fumble RECOVERY is near-pure noise (year-to-year r ~ 0.00).
    Recovery share is therefore reported as a deviation from the league mean
    — a luck meter, not a skill rating."""
    d = base_sample(load(season))
    lg_ff_rate = d["fumble"].sum() / len(d)          # forced-fumble rate/play
    lg_rec_share_opp = (d["fumble_lost"].sum() / d["fumble"].sum()
                        if d["fumble"].sum() else np.nan)
    rows = []
    for t in sorted(d["posteam"].dropna().unique()):
        o = d[d["posteam"] == t]
        x = d[d["defteam"] == t]
        o_ff, o_ff_lost = int(o["fumble"].sum()), int(o["fumble_lost"].sum())
        x_ff, x_ff_lost = int(x["fumble"].sum()), int(x["fumble_lost"].sum())
        rows.append({
            "team": t, "season": season,
            "n_plays": len(o), "n_plays_def": len(x),
            # occurrence (partially skill)
            "own_fumbles": o_ff,
            "own_fumble_rate_per_play": o_ff / len(o) if len(o) else np.nan,
            "own_fumbles_expected": lg_ff_rate * len(o),
            "own_fumble_diff_actual_minus_expected":
                o_ff - lg_ff_rate * len(o),
            "forced_fumbles": x_ff,
            "forced_fumble_rate_per_play": x_ff / len(x) if len(x) else np.nan,
            "forced_fumbles_expected": lg_ff_rate * len(x),
            "forced_fumble_diff_actual_minus_expected":
                x_ff - lg_ff_rate * len(x),
            # recovery (near-pure noise — luck layer)
            "own_fumble_retained_share":
                (o_ff - o_ff_lost) / o_ff if o_ff else np.nan,
            "own_retained_share_vs_league":
                ((o_ff - o_ff_lost) / o_ff - (1 - lg_rec_share_opp))
                 if o_ff else np.nan,
            "opp_fumble_recovery_share":
                x_ff_lost / x_ff if x_ff else np.nan,
            "opp_recovery_share_vs_league":
                (x_ff_lost / x_ff - lg_rec_share_opp) if x_ff else np.nan,
            "league_recovery_share": lg_rec_share_opp,
        })
    out = pd.DataFrame(rows)
    for c in ["forced_fumble_rate_per_play", "opp_fumble_recovery_share"]:
        out[c + "_pct"] = percentile_100(out[c], higher_better=True)
    out["own_fumble_rate_per_play_pct"] = percentile_100(
        out["own_fumble_rate_per_play"], higher_better=False)
    return out


if __name__ == "__main__":
    import os
    os.makedirs(OUT_DIR, exist_ok=True)
    for season in (2025, 2026):
        k = compute_kicker(season)
        k.to_csv(f"{OUT_DIR}/kicker_metrics_{season}.csv", index=False,
                 float_format="%.5f")
        de = compute_defense_detail(season)
        de.to_csv(f"{OUT_DIR}/defense_detail_{season}.csv", index=False,
                  float_format="%.5f")
        st = compute_special_teams(season)
        st.to_csv(f"{OUT_DIR}/special_teams_{season}.csv", index=False,
                  float_format="%.5f")
        tl = compute_turnover_luck(season)
        tl.to_csv(f"{OUT_DIR}/turnover_luck_{season}.csv", index=False,
                  float_format="%.5f")
        print(f"{season}: kicker={len(k)} defense={len(de)} "
              f"special={len(st)} luck={len(tl)}")
