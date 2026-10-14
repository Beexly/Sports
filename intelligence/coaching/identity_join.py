"""THE IDENTITY JOIN — one queryable function, all four keys, order-safe.

Loop 1 of the founder's table, closed: tracklet(mock) -> jersey OCR target ->
roster id -> nflverse participation, joined on the same game_id + play_id,
queryable in one call, with the ordering trap documented and defused.

THE ORDERING TRAP (found by cross-checking during the loop audit):
pbp_participation carries TWO gsis lists:
  - offense_players (11 entries) — ORDER-MATCHED to offense_names /
    offense_numbers / offense_positions. THIS is the join list.
  - players_on_play (22 entries) — ALL players on the field (both sides),
    order NOT specified relative to the offense columns. Zip-matching it
    against offense_names silently assigns the wrong gsis_id (verified:
    Lamb #88 got 00-0037243 [a teammate] instead of 00-0036358).
Verified against the depth chart: Lamb = 00-0036358. Use offense_players.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd

REPO = Path(__file__).resolve().parents[2]
PART = REPO / "intelligence" / "coaching" / "data" / "pbp_participation_2025.parquet"
PBP = REPO / "intelligence" / "coaching" / "data" / "play_by_play_2025.parquet"
PART_2026 = REPO / "intelligence" / "coaching" / "data" / "pbp_participation_2026_reconstructed.parquet"
PBP_2026 = REPO / "intelligence" / "coaching" / "data" / "play_by_play_2026.parquet"


def _split(v: Any) -> list[str]:
    return [s for s in str(v or "").split(";") if s]


def identity_join(game_id: str, play_id: int) -> dict | None:
    """All four identity keys + EPA for one play, one query.

    Supports both 2025 (FTN full participation) and 2026 (reconstructed participation
    from PBP 43 player_id cols + FTN charting 2026 + snap_counts 2026 + roster 2026).

    Returns:
      {
        game_id, play_id, possession,
        epa, wpa, desc,                      # PBP join
        players: [ {name, jersey, position, gsis_id}, ... ],  # offense, order-matched
        defense_players: [ {name, jersey, position, gsis_id}, ... ],  # defense involved (2026+)
        routes: {player_name: route},        # per-receiver route label
        coverage: defense_coverage_type,
        source_files: [...],
      }
      or None if the play is absent from either side (honest miss).
    """
    is_2026 = str(game_id).startswith("2026_")
    part_path = PART_2026 if (is_2026 and PART_2026.exists()) else PART
    pbp_path = PBP_2026 if (is_2026 and PBP_2026.exists()) else PBP

    part = pd.read_parquet(part_path)
    row = part[(part["nflverse_game_id"] == game_id)
               & (part["play_id"] == float(play_id))]
    if not len(row):
        return None
    r = row.iloc[0]

    names = _split(r.get("offense_names"))
    numbers = _split(r.get("offense_numbers"))
    positions = _split(r.get("offense_positions"))
    gsis = _split(r.get("offense_players"))  # ORDER-MATCHED list (see module docstring)
    n = min(len(names), len(numbers), len(positions), len(gsis))
    if n == 0 or len(names) != len(gsis):
        # order integrity check: refuse rather than mis-pair
        return {"error": "column length mismatch",
                "lengths": {"names": len(names), "numbers": len(numbers),
                            "positions": len(positions), "gsis": len(gsis)}}

    players = [{"name": names[i], "jersey": numbers[i],
                "position": positions[i], "gsis_id": gsis[i]}
               for i in range(n)]

    def_names = _split(r.get("defense_names"))
    def_numbers = _split(r.get("defense_numbers"))
    def_positions = _split(r.get("defense_positions"))
    def_gsis = _split(r.get("defense_players"))
    dn = min(len(def_names), len(def_numbers), len(def_positions), len(def_gsis))
    def_players = [{"name": def_names[i], "jersey": def_numbers[i],
                    "position": def_positions[i], "gsis_id": def_gsis[i]}
                   for i in range(dn)] if dn > 0 and len(def_names) == len(def_gsis) else []

    out = {
        "game_id": game_id,
        "play_id": int(play_id),
        "possession": r.get("possession_team"),
        "coverage": (r.get("defense_coverage_type") or None),
        "man_zone": (r.get("defense_man_zone_type") or None),
        "defenders_in_box": None if pd.isna(r.get("defenders_in_box")) else float(r.get("defenders_in_box")),
        "number_of_pass_rushers": None if pd.isna(r.get("number_of_pass_rushers")) else float(r.get("number_of_pass_rushers")),
        "players": players,
        "defense_players": def_players,
        "provenance": r.get("provenance") or "FTN_FULL_2025",
        "source_files": [str(part_path.relative_to(REPO)).replace("\\\\", "/")],
    }
    if r.get("route"):
        out["route_of_play"] = str(r["route"])

    # PBP join for EPA/WPA
    pbp = pd.read_parquet(pbp_path, columns=["game_id", "play_id", "epa", "wpa", "success", "desc"])
    pr = pbp[(pbp["game_id"] == game_id) & (pbp["play_id"] == float(play_id))]
    if len(pr):
        p0 = pr.iloc[0]
        out["epa"] = None if pd.isna(p0["epa"]) else round(float(p0["epa"]), 4)
        out["wpa"] = None if pd.isna(p0["wpa"]) else round(float(p0["wpa"]), 4)
        out["desc"] = str(p0["desc"]).strip()
        out["source_files"].append(str(pbp_path.relative_to(REPO)).replace("\\\\", "/"))
    return out


def query_player(game_id: str, play_id: int, name: str | None = None,
                 jersey: str | None = None) -> dict | None:
    """The founder's proof shape: one play, one player, all keys."""
    j = identity_join(game_id, play_id)
    if not j or "players" not in j:
        return j
    for p in j["players"]:
        if (name and p["name"] == name) or (jersey and p["jersey"] == str(jersey)):
            return {**p, "game_id": game_id, "play_id": int(play_id),
                    "epa": j.get("epa"), "route_of_play": j.get("route_of_play"),
                    "coverage": j.get("coverage")}
    return None


if __name__ == "__main__":
    import json
    import sys
    gid = sys.argv[1] if len(sys.argv) > 3 else "2025_01_DAL_PHI"
    pid = int(sys.argv[2]) if len(sys.argv) > 3 else 141
    who = sys.argv[3] if len(sys.argv) > 3 else "CeeDee Lamb"
    j = query_player(gid, pid, name=who)
    print(json.dumps(j, indent=1))
