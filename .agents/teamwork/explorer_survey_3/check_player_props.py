import json
from pathlib import Path
from collections import defaultdict

repo = Path(r"c:\Users\Garrett\Sports")
archive_dir = repo / "docs" / "data-sources" / "research" / "props-archive"
files = sorted(archive_dir.glob("*_20261018T09.json"))

# Target markets:
# 1. Total Passing Yards
# 2. Total Pass Completions
# 3. Total Passing Touchdowns
# 4. Total Rushing Yards
# 5. Total Carries
# 6. Total Receiving Yards
# 7. Total Receptions
# 8. Total Passing Plus Rushing Yards

MARKETS = {
    "Total Passing Yards (incl. overtime)": "Passing Yards",
    "Total Pass Completions (incl. overtime)": "Pass Completions",
    "Total Passing Touchdowns (incl. overtime)": "Passing Touchdowns",
    "Total Rushing Yards (incl. overtime)": "Rushing Yards",
    "Total Carries (incl. overtime)": "Carries",
    "Total Receiving Yards (incl. overtime)": "Receiving Yards",
    "Total Receptions (incl. overtime)": "Receptions",
    "Total Passing Plus Rushing Yards (incl. overtime)": "Passing Plus Rushing Yards",
}

player_props = defaultdict(dict)

for f in files:
    data = json.loads(f.read_text(encoding="utf-8"))
    game = data.get("game")
    game_id = data.get("game_id")
    for l in data.get("lines", []):
        m = l.get("propMarket")
        if m in MARKETS:
            pname = l.get("playerName")
            if not pname:
                continue
            cat = MARKETS[m]
            # Store line, openLine, lineMoved, asOf, game, game_id
            player_props[pname][cat] = {
                "market_full": m,
                "category": cat,
                "line": l.get("line"),
                "openLine": l.get("openLine"),
                "lineMoved": l.get("lineMoved"),
                "asOf": l.get("asOf"),
                "game": game,
                "game_id": game_id,
            }

print(f"Total unique players with target props in DK archive: {len(player_props)}")
counts_by_cat = defaultdict(int)
for p, cats in player_props.items():
    for c in cats:
        counts_by_cat[c] += 1

print("\nPlayers count per market category:")
for cat, cnt in sorted(counts_by_cat.items(), key=lambda x: -x[1]):
    print(f"  {cat}: {cnt} players")

# Show sample players across markets
sample_players = ["Patrick Mahomes", "C.J. Stroud", "Jordan Love", "Nico Collins", "A.J. Brown", "Kyren Williams", "Bijan Robinson", "Brock Purdy", "George Kittle"]
print("\nSample player props available:")
for sp in sample_players:
    if sp in player_props:
        print(f"\n{sp} ({player_props[sp].get(next(iter(player_props[sp])), {}).get('game')}):")
        for cat, details in player_props[sp].items():
            print(f"  - {cat}: line={details['line']} (open={details['openLine']}, moved={details['lineMoved']})")
    else:
        print(f"\n{sp}: NOT FOUND in target props")
