"""Extend the 2026 participation reconstruction to weeks 6-7.

Follows the method recorded in the existing file's own `provenance` column:
involved players from pbp player-id columns, FTN for box/rushers/formation and the
scheme flags, game snap-active pool from snap_counts. Linemen stay uninvolved —
FTN releases them post-season, which the provenance already says.

Weeks 1-5 are carried through untouched.
"""
import pandas as pd

BASE = "C:/Users/Garrett/Sports/intelligence/coaching/data/"
PROV = ("RECONSTRUCTED_2026_FTN_PBP_SNAPS (involved players + FTN box/rushers/formation + "
        "game snap-active pool; full 22-man uninvolved linemen released by FTN post-season)")

old = pd.read_parquet(BASE + "pbp_participation_2026_reconstructed.parquet")
pbp = pd.read_parquet(BASE + "play_by_play_2026.parquet")
ftn = pd.read_parquet(BASE + "ftn_charting_2026.parquet")
snaps = pd.read_parquet(BASE + "snap_counts_2026.parquet")

new_weeks = sorted(set(pbp["week"].dropna().unique()) - set(old["week"].dropna().unique()))
print("weeks to add:", new_weeks)
if not new_weeks:
    raise SystemExit("nothing to add")

p = pbp[pbp["week"].isin(new_weeks)].copy()
f = ftn.rename(columns={"nflverse_game_id": "game_id", "nflverse_play_id": "play_id"})[
    ["game_id", "play_id", "n_offense_backfield", "n_defense_box",
     "n_pass_rushers", "n_blitzers", "is_motion", "is_play_action", "is_rpo",
     "is_screen_pass", "read_thrown"]
].drop_duplicates(["game_id", "play_id"])
m = p.merge(f, on=["game_id", "play_id"], how="left")
m["ftn_charted"] = m["n_defense_box"].notna()

OFF = ["passer_player_id", "receiver_player_id", "rusher_player_id", "lateral_receiver_player_id",
       "lateral_rusher_player_id", "punt_returner_player_id", "kickoff_returner_player_id",
       "punter_player_id", "kicker_player_id"]
DEF = ["tackle_for_loss_1_player_id", "tackle_for_loss_2_player_id", "qb_hit_1_player_id",
       "qb_hit_2_player_id", "interception_player_id", "sack_player_id", "half_sack_1_player_id",
       "half_sack_2_player_id", "forced_fumble_player_1_player_id", "assist_tackle_1_player_id"]


def join_ids(row, cols):
    vals = [row[c] for c in cols if c in row and isinstance(row[c], str) and row[c]]
    return ";".join(dict.fromkeys(vals))


m["offense_players"] = m.apply(lambda r: join_ids(r, OFF), axis=1)
m["defense_players"] = m.apply(lambda r: join_ids(r, DEF), axis=1)
m["players_on_play"] = (m["offense_players"] + ";" + m["defense_players"]).str.strip(";")

pool = (snaps.groupby(["game_id", "team"])["pfr_player_id"].apply(
    lambda s: ";".join(sorted({x for x in s if isinstance(x, str)}))).rename("pool").reset_index())
off_pool = pool.rename(columns={"team": "posteam", "pool": "game_active_offense_gsis"})
def_pool = pool.rename(columns={"team": "defteam", "pool": "game_active_defense_gsis"})
m = m.merge(off_pool, on=["game_id", "posteam"], how="left").merge(
    def_pool, on=["game_id", "defteam"], how="left")

out = pd.DataFrame({
    "nflverse_game_id": m["game_id"], "old_game_id": m.get("old_game_id"),
    "play_id": m["play_id"], "season": m["season"], "week": m["week"],
    "possession_team": m["posteam"], "defensive_team": m["defteam"],
    "play_type": m["play_type"], "offense_formation": None,  # not in pbp or FTN for 6-7
    "n_offense_backfield": m["n_offense_backfield"], "defenders_in_box": m["n_defense_box"],
    "number_of_pass_rushers": m["n_pass_rushers"], "n_blitzers": m["n_blitzers"],
    "is_motion": m["is_motion"], "is_play_action": m["is_play_action"], "is_rpo": m["is_rpo"],
    "is_screen_pass": m["is_screen_pass"], "read_thrown": m["read_thrown"],
    "offense_players": m["offense_players"], "offense_names": None, "offense_numbers": None,
    "offense_positions": None, "defense_players": m["defense_players"], "defense_names": None,
    "defense_numbers": None, "defense_positions": None, "players_on_play": m["players_on_play"],
    "game_active_offense_gsis": m["game_active_offense_gsis"],
    "game_active_defense_gsis": m["game_active_defense_gsis"],
    "ftn_charted": m["ftn_charted"], "provenance": PROV,
    "ngs_route_runners_gsis": None, "ngs_blitzers_gsis": None,
})
out = out[old.columns]
combined = pd.concat([old, out], ignore_index=True)
combined.to_parquet(BASE + "pbp_participation_2026_reconstructed.parquet", index=False)
print("rows", len(old), "->", len(combined), "weeks", sorted(combined["week"].dropna().unique()))
print("ftn_charted on new rows:", int(out["ftn_charted"].sum()), "of", len(out))
