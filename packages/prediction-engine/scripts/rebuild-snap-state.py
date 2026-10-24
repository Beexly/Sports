"""Weekly check. One shell definition, already in league_sii.json.

SINGLE is Cover 0 + Cover 1 + Cover 3. SPLIT is Cover 2 + Cover 4 + Cover 6.
Motion and play-action against SINGLE must beat SPLIT in every season in
the cube. This is the gate we run when a new season is added.

A from-scratch join on the current nflverse files does not reproduce the
no-play-action EPA in that cube, so this script does not overwrite it.
2026 participation is unpublished. There is no 2026 shell to add.

  python packages/prediction-engine/scripts/rebuild-snap-state.py
"""
import json
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "src" / "nfl" / "data"
SEASONS = (2023, 2024, 2025)


def cells(rows):
    out = {}
    for row in rows:
        out[(row[0], row[1], row[2], row[3])] = (row[4], row[5])
    return out


def main():
    cube = json.loads((DATA / "league_sii.json").read_text())
    got = cells(cube["rows"])
    bad = 0
    for season in SEASONS:
        single = got.get((season, "PA", "MOT", "SINGLE"))
        split = got.get((season, "PA", "MOT", "SPLIT"))
        if single is None or split is None or single[0] < 500 or split[0] < 200:
            print("missing season", season)
            bad += 1
            continue
        s_epa = single[1] / single[0]
        t_epa = split[1] / split[0]
        print(f"{season} PA+MOT single n={single[0]} epa={s_epa:+.3f}  split n={split[0]} epa={t_epa:+.3f}")
        if s_epa <= t_epa:
            print("  FAIL single does not beat split")
            bad += 1
    pressure = json.loads((DATA / "snap-pressure.json").read_text())
    by = {(c["quick"], c["pressure"]): c for c in pressure["cells"]}
    held = by[(False, False)]["epa"] - by[(False, True)]["epa"]
    print(f"pressure cost of a held ball {held:+.3f} EPA")
    if held < 0.4:
        print("  FAIL pressure table moved")
        bad += 1
    routes = json.loads((DATA / "route-shell.json").read_text())
    for route in routes["routes"]:
        gaps = []
        for season in route["seasons"]:
            gap = season["single"]["epa"] - season["split"]["epa"]
            gaps.append(gap)
            if season["single"]["n"] < 80 or season["split"]["n"] < 80:
                print("thin route", route["route"], season["season"])
                bad += 1
        same = all(g > 0 for g in gaps) or all(g < 0 for g in gaps)
        print(f"route {route['route']:22} favors {route['favors']:6} gaps={[round(g, 3) for g in gaps]}")
        if not same:
            print("  FAIL route gap flipped")
            bad += 1
    light = [s for s in routes["runBox"] if s["box"] == 5][0]
    loaded = [s for s in routes["runBox"] if s["box"] == 7][0]
    for a, b in zip(light["seasons"], loaded["seasons"]):
        if a["epa"] <= b["epa"]:
            print("FAIL box", a["season"])
            bad += 1
    print("run box 5 stays ahead of box 7")
    return bad


if __name__ == "__main__":
    sys.exit(main())
