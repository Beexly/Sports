"""pydfs-lineup-optimizer bridge (MIT) — the MILP solver for GSE lineups.

stdin JSON:
{
  "site": "draftkings",            # draftkings | draftkings_captain | fanduel | fanduel_single_game
  "n": 3,                          # lineups to generate
  "players": [
    {"name": "...", "position": "QB", "salary": 6000, "projected": 18.4,
     "team": "CHI", "opponent": "NE"}
  ]
}

Projections MUST come from the GSE simulator (publicPrior lineage). This
bridge never reads a commercial projection file. The 50000 cap, 6 slots and
1.5x captain salary/points are the site settings pydfs ships (and GSE
lineup.ts mirrors them for the TS-side guard).

Output: one JSON object per lineup on stdout.
"""
from __future__ import annotations
import json, sys

from pydfs_lineup_optimizer import Site, Sport, get_optimizer
from pydfs_lineup_optimizer.player import Player

SITES = {
    "draftkings": Site.DRAFTKINGS,
    "draftkings_captain": Site.DRAFTKINGS_CAPTAIN_MODE,
    "fanduel": Site.FANDUEL,
    "fanduel_single_game": Site.FANDUEL_SINGLE_GAME,
}


def main() -> None:
    req = json.loads(sys.stdin.read())
    site_key = req.get("site", "draftkings")
    if site_key not in SITES:
        print(json.dumps({"error": f"unknown site {site_key}"}))
        sys.exit(2)
    optimizer = get_optimizer(SITES[site_key], Sport.FOOTBALL)
    captain = "captain" in site_key or "single_game" in site_key
    players = []
    for i, p in enumerate(req.get("players", [])):
        name = p["name"]
        first, _, last = name.partition(" ")
        base = dict(
            player_id=p.get("player_id") or f"{name}-{i}",
            first_name=first or name,
            last_name=last or "",
            team=p.get("team") or "",
            salary=int(p["salary"]),
            fppg=float(p["projected"]),
            is_confirmed_starter=bool(p.get("is_confirmed_starter", True)),
        )
        if captain:
            # Captain variant: 1.5x salary and points (GSE lineup.ts CAPTAIN_MULT).
            base["salary"] = int(base["salary"] * 1.5)
            base["fppg"] = base["fppg"] * 1.5
            players.append(Player(**base, positions=["CPT"]))
            base["salary"] = int(p["salary"])
            base["fppg"] = float(p["projected"])
            flex = dict(base)
            flex["player_id"] = f"{base['player_id']}-FLEX"
            players.append(Player(**flex, positions=["FLEX"]))
        else:
            players.append(Player(**base,
                                  positions=[p["position"]] if isinstance(p["position"], str) else list(p["position"])))
    optimizer.extend_players(players)
    n = int(req.get("n", 1))
    for lineup in optimizer.optimize(n=n):
        print(json.dumps({
            "total_points": round(lineup.fantasy_points_projection, 3),
            "total_salary": lineup.salary_costs,
            "players": [
                {"name": pl.full_name, "positions": pl.positions, "salary": pl.salary,
                 "projected": round(pl.fppg, 3), "team": pl.team}
                for pl in lineup.lineup
            ],
        }))


if __name__ == "__main__":
    main()
