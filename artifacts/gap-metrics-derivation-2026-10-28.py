"""Derive the three gap metrics that have data on disk: SII, TOR, SPESE.

SII  — scheme-interaction: EPA by (motion|PA|RPO|screen) x box count, and the
       interaction lift over the marginal.
TOR  — turnover regret: fumble recovery rate against the 50% coin, per team.
SPESE— special-teams expected points: EPA on ST plays, per team.

Writes artifacts/gap-metrics-2026-10-28.json. RLS stays a gap: no separation
column exists in any local file.
"""
import json
import pandas as pd

BASE = "C:/Users/Garrett/Sports/intelligence/coaching/data/"
part = pd.read_parquet(BASE + "pbp_participation_2026_reconstructed.parquet")
pbp = pd.read_parquet(BASE + "play_by_play_2026.parquet")

key = ["nflverse_game_id", "play_id"]
pcols = key + ["is_motion", "is_play_action", "is_rpo", "is_screen_pass",
               "defenders_in_box", "n_blitzers", "possession_team", "play_type"]
d = part[[c for c in pcols if c in part.columns]].copy()
b = pbp[["game_id", "play_id", "epa", "fumble", "fumble_forced", "fumble_not_forced",
         "fumble_out_of_bounds", "fumble_lost", "posteam", "play_type", "special"]].copy()
b = b.rename(columns={"game_id": "nflverse_game_id", "posteam": "posteam_b"})
m = d.merge(b, on=key, how="inner", suffixes=("", "_b"))
m = m[m["epa"].notna()]
out = {"rows_joined": int(len(m)), "source": "pbp_participation_2026_reconstructed + play_by_play_2026"}

# ---- SII ----
FLAGS = ["is_motion", "is_play_action", "is_rpo", "is_screen_pass"]
m = m[m["defenders_in_box"].notna()]
m["box_bucket"] = pd.cut(m["defenders_in_box"], [0, 6, 7, 8, 20], labels=["<=6", "7", "8", "9+"])
sii = {}
for f in FLAGS:
    if f not in m.columns:
        continue
    g = m.groupby([f, "box_bucket"], observed=True)["epa"].agg(["mean", "count"])
    marg = m.groupby(f)["epa"].mean()
    cells = {}
    for (flag, box), row in g.iterrows():
        if row["count"] < 25:
            continue
        lift = float(row["mean"] - marg.loc[flag])
        cells[f"{int(flag)}|{box}"] = {"flag_state": bool(flag), "box": str(box),
                                       "epa": round(float(row["mean"]), 4),
                                       "n": int(row["count"]), "lift_vs_marginal": round(lift, 4)}
    sii[f] = {"marginal_epa": round(float(marg.loc[True]), 4) if True in marg.index else None,
              "cells": cells}
out["sii"] = sii

# ---- TOR ----
fb = m[m["fumble"] == 1]
tor = {}
if len(fb):
    for team, g in fb.groupby("posteam_b"):
        if len(g) < 5:
            continue
        lost = float(g["fumble_lost"].fillna(0).sum())
        tor[team] = {"fumbles": int(len(g)), "lost": int(lost),
                     "lost_rate": round(lost / len(g), 4)}
league_lost = float(fb["fumble_lost"].fillna(0).sum()) / len(fb) if len(fb) else None
for team, rec in tor.items():
    rec["regret_vs_league"] = round(rec["lost_rate"] - league_lost, 4)
out["tor"] = {"n_fumbles": int(len(fb)), "league_lost_rate": round(league_lost, 4), "teams": tor}

# ---- SPESE ----
ST_TYPES = ["punt", "field_goal", "kickoff", "extra_point"]
st = m[m["play_type_b"].isin(ST_TYPES)] if "play_type_b" in m.columns else pd.DataFrame()
spese = {}
if len(st):
    for team, g in st.groupby("posteam_b"):
        if len(g) < 10:
            continue
        spese[team] = {"st_plays": int(len(g)), "epa_per_play": round(float(g["epa"].mean()), 4)}
out["spese"] = {"n_st_plays": int(len(st)), "teams": spese}

json.dump(out, open("C:/Users/Garrett/Sports/artifacts/gap-metrics-2026-10-28.json", "w"), indent=1)
print(json.dumps({"joined": out["rows_joined"], "sii_flags": list(sii),
                  "fumbles": out["tor"]["n_fumbles"], "st_plays": out["spese"]["n_st_plays"],
                  "tor_teams": len(tor), "spese_teams": len(spese)}, indent=1))
